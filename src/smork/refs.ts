//! Smork, the smol framework
import { assign, forEach, identity, isFunction, isNil, mapValues, mapzilla } from "../lodashish";
import { Func, TypescriptErrorClarification } from "../types";
import { $with, mutate } from "../utils";

export class SmorkError extends Error {
  constructor(message: string) {
    super(`smork: ${message}`);
  };
};

export function ref<T>(value: Exclude<T, Func>): WritableRef<T>;
export function ref<T>(): WritableRef<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): SetterRef<T>;

export function ref<T>(valueOrGetter?: T | (() => T), setter?: (value: T) => void) {
  return isFunction(valueOrGetter) 
    ? computed(valueOrGetter, setter)
    : new WritableRef(valueOrGetter);
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class Ref<T> {

  private watchers = new Set<Watcher<T>>();
  private activeWatchers = new WeakSet<Watcher<T>>();
  
  constructor(
    private _value: T
  ) { };

  get() {
    currentComputedTracker?.(this);
    return this._value;
  };

  protected _set(value: T) {
    const { _value: oldValue } = this;
    if ( value !== this._value ) {
      this._value = value;
      try {
        for ( const watcher of this.watchers ) {
          if ( this.activeWatchers.has(watcher) ) {
            console.warn('smork: watcher is already active — perhaps a circular dependency — exiting watch to prevent infinite loop');
            return;
          }
          this.activeWatchers.add(watcher);
          watcher(value, oldValue);
        };
      } finally {
        this.activeWatchers = new WeakSet();
      };
    }
  };

  runAndWatch(watcher: Watcher<T>) {
    watcher(this._value, this._value);
    this.watch(watcher);
  };

  /**
   * @alias runAndWatch
   */
  watchImmediate = this.runAndWatch;

  watch(watcher: Watcher<T>) {
    this.watchers.add(watcher);
  };

  /**
   * @alias watch
   */
  onChange = this.watch; // just an alias

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
      this.unwatch(mapped.update); // to not watch the getter itself, and to allow the mapped ref to be garbage collected
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

export class MappedRef<U, T> extends Ref<U> {
  
  constructor(
    public readonly source: Ref<T>,
    private mapper: (value: T) => U
  ) {
    super(mapper(source.value));
    source.watch(this.update);
  };

  update = (value: T) => this._set(this.mapper(value));

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

let currentComputedTracker: ((ref: Ref<any>) => void) | undefined = undefined;

export class ComputedRef<T> extends Ref<T> {

  private _dependencies = new Set<Ref<any>>();

  track = () => {
    if ( currentComputedTracker ) {
      throw new SmorkError(
        "Tried to compute a ref while another one is already being computed — did you nest a computed ref in another ref's getter function?"
      );
    };
    this._dependencies.forEach(ref => ref.unwatch(this.track));
    this._dependencies = new Set();
    try {
      currentComputedTracker = ref => {
        ref.watch(this.track);
        this._dependencies.add(ref);
      };
      this._set(this.getter());
    } finally {
      currentComputedTracker = undefined;
    }
  };

  get dependencies() {
    return this._dependencies;
  }

  constructor(
    private getter: () => T
  ) {
    super(undefined as any); // we need to initialize with an empty value to avoid running the getter twice (once in the constructor and once in the track method)
    this.track();
  };

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

type NoOverlap<T, U> = 
  keyof T & keyof U extends never 
    ? T 
    : TypescriptErrorClarification<`'${Extract<keyof T & keyof U, string>}' cannot be used as a key"`>;

export function refs<T extends Record<string, any>>(refables: Refables<T>): Ref<T>;
export function refs<T extends Record<string, any>>(refables: Refables<T>, includeRefs: true): [ jointRef: Ref<T>, refs: { [K in keyof T]: Ref<T[K]> } ];
export function refs<T extends Record<string, any>>(refables: Refables<T>, includeRefs = false) {
  const writableRef = new WritableRef(unrefs<T>(refables));
  const refs = torefs<T>(refables);
  forEach(refs, (ref, key) => {
    if ( key in writableRef )
      throw new SmorkError(`Key "${key}" already exists in the joint ref. Please use a different key.`);
    ref.watch(value => {
      const { [key]: oldValue, ...rest } = writableRef.value;
      writableRef.value = { ...rest, [key]: value } as T;
    });
  });
  const readonlyRef: Ref<T> = writableRef.clone();
  return includeRefs ? [ readonlyRef, refs ] as const : readonlyRef;
};