//! Smork, the smol framework
import { Callable } from "../callable";
import { assign, identity, isFunction, mapValues, uniqueId, values } from "../lodashish";
import { Defined, Func } from "../types";
import { $with, Box, mutated } from "../utils";
import { Undefined } from "../types";
import { allRefs, DEV_MODE } from "./devTools";

export class SmorkError extends Error {
  constructor(message: string) {
    super(`smork: ${message}`);
  };
};

export type Refs<T> = { [K in keyof T]: Ref<T[K]> };

export function isRefs<T>(value: any): value is Refs<T> {
  return value && typeof value === 'object' && values(value).every(value => value instanceof Ref);
};

export function ref<T>(value: Exclude<T, Func | Refs<any>>): WritableRef<T>;
export function ref<T>(): WritableRef<T | undefined>;
export function ref<TRefs extends Record<string | number | symbol, Ref<any>>>(refs: TRefs): ComputedRef<Unrefs<TRefs>>;
export function ref<T>(getter: () => T): ComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): SetterRef<T>;

export function ref<T>(valueOrGetter?: T | Refs<T> | (() => T), setter?: (value: T) => void) {
  return isFunction(valueOrGetter) 
    ? computed(valueOrGetter, setter)
    : 
      isRefs(valueOrGetter)
        ? new ComputedRef(() => mapValues(valueOrGetter, unref), values(valueOrGetter))
        : new WritableRef(valueOrGetter);
};

export type Watcher<T, TOld = T> = (value: T, oldValue: TOld) => void;

export const NotApplicable = Symbol('NotApplicable');

export class Ref<T> extends Callable<FunctionalAccessor<T, undefined>> {

  public watchers = new Set<Watcher<T>>();
  private activeWatchers = new WeakSet<Watcher<T>>();
  public targets = new Set<ComputedRef<any>>();
  public id = uniqueId('ref-');
  public name = Undefined<string>();
  
  constructor(
    private _value: T
  ) {
    super();
    DEV_MODE && allRefs.add(this);
  };

  named<Name extends string>(name: Name) {
    return mutated(this, { name });
  };

  get() {
    currentComputedTracker?.(this);
    return this._value;
  };

  protected _set(value: T) {
    const { _value: oldValue } = this;
    if ( value !== oldValue ) {
      this._value = value;
      this.tarnishTargets();
      try {
        for ( const watcher of this.watchers ) {
          if ( this.activeWatchers.has(watcher) ) {
            console.warn('smork: watcher is already active — perhaps a circular dependency — exiting watch to prevent infinite loop');
            // break;
          };
          this.activeWatchers.add(watcher);
          watcher(value, oldValue);
        };
      } finally {
        this.activeWatchers = new WeakSet();
      };
    };
  };

  call = Box(() => this.get());

  protected tarnishTargets() {
    this.targets.forEach(target => target.tarnish());
  };

  watchImmediate(watcher: Watcher<T, T | typeof NotApplicable>) {
    watcher(this.value, NotApplicable);
    this.watch(watcher);
  };

  watch(watcher: Watcher<T>) {
    this.watchers.add(watcher);
  };

  unwatch(watcher: Watcher<T>) {
    this.watchers.delete(watcher);
  };

  get value() {
    return this.get();
  };

  map<U, TArgs extends any[]>(nestedGetter: Func<[T], Func<TArgs, U>>): Func<TArgs, Ref<U>>;
  map<U>(getter: Func<[T], U>): Ref<U>;
  map<U, TArgs extends any[]>(nestableGetter: Func<[T], U | Func<TArgs, U>>) {
    const mapped = new MappedRef(this, nestableGetter);
    if ( isFunction(mapped.value) ) {
      // this.unwatch(mapped.update); // to not watch the getter itself, and to allow the mapped ref to be garbage collected
      this.targets.delete(mapped);
      mapped.sources.clear();
      return (...args: TArgs) => new MappedRef(this, 
        value => (nestableGetter as (value: T) => (...args: TArgs) => U)(value)(...args)
      );
    };
    return mapped as any;
  };

  mapDefined<U>(callback: (value: T & ({} | null)) => U) {
    return this.map(value => value !== undefined ? callback(value) : undefined);
  };

  uses<
    U extends Record<string, (value: T) => any>
  >(methods: U) {
    return assign(this, mapValues(methods, this.map)) as this & {
      [K in keyof U]:
        ReturnType<U[K]> extends Func<infer TArgs, infer TReturn>
          ? Func<TArgs, MappedRef<TReturn, T>>
          : MappedRef<ReturnType<U[K]>, T>
    };
  };

  setter(setter = (value: T) => this._set(value)) {
    return new SetterRef(this, setter);
  };

};

const readonlyRef = new Ref(5);
const value = readonlyRef()
//@ts-expect-error because it's readonly
const setValue = readonlyRef(5);

let currentComputedTracker: ((ref: Ref<any>) => void) | undefined = undefined;

/**
 * A computed reference that derives its value from other references (`sources`) using a getter function.
 * 
 * Said references can be either predefined, if passed to the constructor, or dynamically tracked during the getter execution.
 * 
 * Computed refs are “lazy,” meaning they will only recalculate when either:
 * - They are accessed (using the `get` method or the `value` property)
 * - They are watched
 */
export class ComputedRef<T> extends Ref<T> {

  readonly sources: Set<Ref<any>>;
  sourcesPredefined = false;
  private dirty = true;
  
  constructor(
    private getter: () => T,
    predefinedSources = Undefined<Array<Ref<any>>>()
  ) {
    super(undefined as any);
    this.sources = new Set(predefinedSources);
    if ( this.sourcesPredefined = !!predefinedSources ) { // not a typo
      predefinedSources.forEach(ref => ref.targets.add(this));
    };
  };

  /**
   * Marks the current ref and its targets as dirty.
   * 
   * - If the ref is already dirty, it does nothing.
   * - If there are watchers on the current object, it triggers the recalculation right away to notify them.
   * - Otherwise, it marks the targets as dirty but doesn't recalculate them or itself until they are accessed or watched.
   */
  tarnish() {
    if ( this.dirty ) return;
    this.dirty = true;
    if ( this.watchers.size ) {
      this.recalculate();
    } else {
      this.tarnishTargets();
    };
  };

  /**
   * Retrieves the value, recalculating it if necessary.
   * 
   * If the value is marked as dirty, calls the recalculate method.
   * Otherwise, returns the value cached during the last recalculation.
   * 
   * (Newly created computed refs are dirty by definition, so they will recalculate on the first access.)
   */
  get() {
    if ( this.dirty ) {
      this.recalculate();
    };
    return super.get();
  };

  /**
   * Recalculates the current state of the ref.
   * 
   * - If `sourcesPredefined` is true, it simply calls the `update` method, updating the value according to the getter.
   * - Otherwise, it clears the sources set, then recalculates the getter while tracking the sources.
   * 
   * In both cases, it updates the cached value and marks the ref as clean.
   */
  private recalculate() {
    if ( this.sourcesPredefined ) return this.update();
    if ( currentComputedTracker ) {
      throw new SmorkError(
        "Tried to compute a ref while another one is already being computed — did you nest a computed ref in another ref's getter function?"
      );
    };
    // this.sources.forEach(ref => ref.unwatch(this.track));
    this.sources.forEach(ref => ref.targets.delete(this));
    this.sources.clear();
    try {
      currentComputedTracker = ref => {
        // ref.addEffect(this.options.dontRetrack ? this.update : this.track);
        this.sources.add(ref);
        ref.targets.add(this);
      };
      this.update();
    } finally {
      currentComputedTracker = undefined;
    }
  };

  /**
   * Updates the cached value according to the getter and marks the ref as clean.
   */
  update = () => { 
    this._set(this.getter());
    this.dirty = false;
  }

};

export function computed<T>(getter: () => T): ComputedRef<T>;
export function computed<T>(getter: () => T, setter: (value: T) => void): SetterRef<T>;
export function computed<T>(getter: () => T, setter: ((value: T) => void) | undefined): ComputedRef<T> | SetterRef<T>;
export function computed<T>(getter: () => T, setter?: (value: T) => void) {
  return $with(new ComputedRef(getter), computedRef =>
    setter
      ? computedRef.setter(setter)
      : computedRef
  );
};


export class MappedRef<U, T> extends ComputedRef<U> {
  
  constructor(
    public readonly source: Ref<T>,
    mapper: (value: T) => U
  ) {
    super(() => mapper(source.value), [source]);
  };

};

export class WritableRef<T> extends Ref<T> {
  
  set(value: T) {
    this._set(value);
  }

  set value(value: T) {
    this.set(value);
  };

  get value() {
    return this.get();
  };

  bridge<U>(forward: (value: T) => U, backward: (value: U) => T) {
    return this.map(forward).setter(value => this.set(backward(value)));
  };

  clone() {
    return new CloneRef(this) as Ref<T>;
  };

};

/**
 * A readonly ref that is synchronized with a writable ref. Useful if you don't want a ref to be modifiable downstream while still being able to update it in your own code.
 */
export class CloneRef<T> extends MappedRef<T, T> {
  
  constructor(
    public source: WritableRef<T>
  ) {
    super(source, identity);
  };

};

export class SetterRef<T> extends WritableRef<T> {

  constructor(
    public source: Ref<T>,
    setter: (value: T) => void,
    public allowMismatch = false
  ) {
    super(source.value);
    super.watch(assignTo(this));
  };

  set(value: T) {
    super.set(value);
    if ( !this.allowMismatch && this.value !== value ) {
      throw new SmorkError('Setter did not update the value. If you want to allow this, set the allowMismatch property to true.');
    };
  };

};

export function assignTo<T>(ref: WritableRef<T>) {
  return (value: T) => {
    ref.set(value);
  };
};

// Refables

export type Refable<T> = T | Ref<T>;


export function unref<T>(refable: Refable<T>): T;
export function unref<TRefable>(refable: TRefable extends Ref<infer U> ? Ref<U> : TRefable): TRefable extends Ref<infer U> ? U : TRefable;
export function unref<T>(refable: Refable<T>) {
  return refable instanceof Ref ? refable.value : refable;
};

export type Unref<TRefable> = ReturnType<typeof unref<TRefable>>;

/**
 * ### Notes
 * - If the value is already a ref, it will be returned as is, NOT wrapped in a new computed ref.
 * - If a simple value is passed, it will be wrapped in a new **readonly** ref.
 */
export function toref<T>(refable: Refable<T>): Ref<T>;
export function toref<T>(refable: T extends Ref<infer U> ? Ref<U> : T): 
  Exclude<
    T extends Ref<infer U> ? Ref<U> : Ref<T>,
    Ref<false> | Ref<true> // because boolean is technically true | false, making it distribute over the union. TypeScript can be beautifully weird.
  >
export function toref<T>(refable: T) {
  return refable instanceof Ref ? refable : new Ref(refable);
};

export type Toref<T> = ReturnType<typeof toref<T>>;

export type Refables<T> = {
  [K in keyof T]: Refable<T[K]>
};

// test

type Test = {
  a: number,
  b?: string,
  c: boolean
};

type RefTest = Refables<Test>;

export function unrefs<T>(refs: Refables<T>): T;
export function unrefs<T extends Refables<any>>(refs: Refables<T>):{ [K in keyof T]: Unref<T[K]> };
export function unrefs<T extends Refables<any>>(refs: Refables<T>) {
  return mapValues(refs, unref);
};

export function torefs<T>(refables: Refables<T>): { [K in keyof T]: Ref<T[K]> };
export function torefs<T extends Record<string, any>>(values: T): { [K in keyof T]: Toref<T[K]> };
export function torefs<T extends Record<string, any>>(values: T) {
  return mapValues(values, toref);
};

export type Unrefs<T extends Refables<any>> = ReturnType<typeof unrefs<T>>;