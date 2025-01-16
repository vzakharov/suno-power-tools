//! Smork, the smol framework
import assert from "assert";
import { assign, forEach, identity, isFunction, mapValues } from "../lodashish";
import { Func, infer, Inferable } from "../types";
import { isEqual, mutate, truthy } from "../utils";

export class SmorkError extends Error {
  constructor(message: string) {
    super(`smork: ${message}`);
  };
};

export function ref<T>(value: Exclude<T, Func>): WritableRef<T>;
export function ref<T>(): WritableRef<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;

export function ref<T>(valueOrGetter?: T | (() => T), setter?: (value: T) => void) {
  return isFunction(valueOrGetter) 
    ? computed(valueOrGetter, setter)
    : new WritableRef(valueOrGetter);
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class Ref<T> {

  protected watchers = new Set<Watcher<T>>();
  private activeWatchers = new WeakSet<Watcher<T>>();

  constructor(
    protected _value: T
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

  map<U, TArgs extends any[]>(nestedGetter: Func<[T], Func<TArgs, U>>): Func<TArgs, MappedRef<T, U>>;
  map<U>(getter: Func<[T], U>): MappedRef<T, U>;
  map<U, TArgs extends any[]>(nestableGetter: Func<[T], U | Func<TArgs, U>>) {
    const mapped = new MappedRef(this, nestableGetter);
    if ( isFunction(mapped.value) ) {
      this.unwatch(mapped.update); // to not watch the getter itself, and to allow the mapped ref to be garbage collected
      return (...args: TArgs) => new MappedRef(this, 
        value => (nestableGetter as (value: T) => (...args: TArgs) => U)(value)(...args)
      );
    };
    return mapped;
  };

  if<U>(compareTo: T, ifEquals: Inferable<U, T>, ifNot: Inferable<U, T>): MappedRef<T, U>;
  if<G extends T, U, V>(typeguard: (value: T) => value is G, ifMatches: Inferable<U, G>, ifNot: (value: Exclude<T, G>) => V): MappedRef<T, U | V>;
  if<U>(predicate: (value: T) => boolean, ifHolds: Inferable<U>, ifNot: Inferable<U>): MappedRef<T, U>;
  if<U>(comparator: T | ((value: T) => any) | ((value: T) => boolean), ifYes: (Inferable<U, T>), ifNot: Inferable<U, T>) {
    return this.map(value => 
      (
        isFunction(comparator) ? comparator : isEqual(comparator)
      )(value) 
        ? infer(ifYes, value) 
        : infer(ifNot, value)
    );
  };

  merge<U>(mergee: Refable<U> | undefined) {
    return mergee
      ? computed(() => ({
        ...this.value,
        ...unref(mergee)
      }))
      : this;
  };

  uses<
    U extends Record<string, (value: T) => any>
  >(methods: U) {
    return assign(this, mapValues(methods, this.map)) as this & {
      [K in keyof U]:
        ReturnType<U[K]> extends Func<infer TArgs, infer TReturn>
          ? Func<TArgs, MappedRef<T, TReturn>>
          : MappedRef<T, ReturnType<U[K]>>
    };
  };

  onceSet(callback: (value: NonNullable<T>) => void) {
    const wrapped = (value: T) => {
      if ( value ) {
        this.unwatch(wrapped);
        callback(value);
      };
    };
    this.watchImmediate(wrapped);
  };

};

export class MappedRef<T, U> extends Ref<U> {
  
  constructor(
    public readonly dependency: Ref<T> | undefined,
    private mapper: (value: T) => U
  ) {
    if ( dependency ) {
      super(mapper(dependency.value));
      dependency.watch(this.update);
    };
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
    return new WritableComputedRef(
      () => forward(this.value),
      value => this.set(backward(value))
    );
  };

};

export function assignTo<T>(ref: WritableRef<T>) {
  return (value: T) => {
    ref.set(value);
  };
};

let currentComputedTracker: ((ref: Ref<any>) => void) | undefined = undefined;

export class ComputedRef<T> extends WritableRef<T> {

  private dependencies = new Set<Ref<any>>();

  track = () => {
    if ( currentComputedTracker ) {
      throw new SmorkError(
        "Tried to compute a ref while another one is already being computed — did you nest a computed ref in another ref's getter function?"
      );
    };
    this.dependencies.forEach(ref => ref.unwatch(this.track));
    this.dependencies = new Set();
    try {
      currentComputedTracker = ref => {
        ref.watch(this.track);
        this.dependencies.add(ref);
      };
      this._set(this.getter());
    } finally {
      currentComputedTracker = undefined;
    }
  };

  constructor(
    private getter: () => T
  ) {
    super(undefined as any); // we need to initialize with an empty value to avoid running the getter twice (once in the constructor and once in the track method)
    this.track();
  };

};

export class WritableComputedRef<T> extends WritableRef<T> {

  constructor(
    getter: () => T,
    private setter: (value: T) => void,
    public allowMismatch = false
  ) {
    const computedRef = new ComputedRef(getter);
    super(computedRef.value);
    computedRef.watch(value => this._set(value));
  };

  set(value: T) {
    this.setter(value);
    if ( !this.allowMismatch && this.value !== value ) {
      throw new SmorkError('Setter did not update the value. If you want to allow this, set the allowMismatch property to true.');
    };
  };

};

export function computed<T>(getter: () => T): ComputedRef<T>;
export function computed<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;
export function computed<T>(getter: () => T, setter: ((value: T) => void) | undefined): ComputedRef<T> | WritableComputedRef<T>;
export function computed<T>(getter: () => T, setter?: (value: T) => void) {
  return setter
    ? new WritableComputedRef(getter, setter)
    : new ComputedRef(getter);
};


export function useNot(ref: Ref<any>) {
  return computed(() => {
    return !ref.value
  });
};

export type Refable<T> = T | Ref<T> //| (() => T) ;
export type Unref<TRefable> = 
  TRefable extends Ref<infer T> 
    ? T 
  : TRefable extends () => infer T
    ? T
  : TRefable;

export type Refables<T extends Record<string, any>> = {
  [K in keyof T]: Refable<T[K]>
};

// test

type Test = {
  a: number,
  b?: string,
  c: boolean
};

type RefTest = Refables<Test>;

export function unrefs<T extends Refables<any>>(refs: Refables<T>) {
  return mapValues(refs, unref) as {
    [K in keyof T]: Unref<T[K]>
  }
};

export function torefs<T extends Record<string, any>>(values: T) {
  return mapValues(values, toref) as {
    [K in keyof T]: T[K] extends Func ? T[K] : WritableRef<T[K]>
  }
};

export type Unrefs<T extends Refables<any>> = ReturnType<typeof unrefs<T>>;

export function isRefOrGetter<T>(value: Refable<T>) {
  return isFunction(value) || value instanceof Ref;
};

export function refResolver<T>(arg: Refable<T>) {
  return <U>(ifRef: (ref: Ref<T>) => U, /*ifFunction: (fn: () => T) => U, */ifValue: (value: T) => U) => {
    return (
      arg instanceof Ref
        ? ifRef(arg)
      // : isFunction(arg)
      //   ? ifFunction(arg)
      : ifValue(arg)
    );
  };
};

export function unref<T>(arg: Refable<T>) {
  return refResolver(arg)(
    ref => ref.value,
    // fn => fn(),
    value => value
  )
};

/**
 * ### Notes
 * - If the value is already a ref, it will be returned as is, NOT wrapped in a new computed ref.
 * - If a simple value is passed, it will be wrapped in a new **readonly** ref.
 */
export function toref<T>(arg: Refable<T>) {
  return refResolver(arg)(
    ref => ref,
    // fn => computed(fn),
    value => new Ref(value)
  )
};

/**
 * Invokes the provided callback immediately on the current value of a ref, the current result of a getter, or the provided value itself.
 * If a ref or a getter is provided, starts watching the ref itself or a new computed ref based on the getter.
 * 
 * **NB!** Unless a ref/getter is provided, the callback will only be invoked once.
 */
export function runAndWatch<T>(refable: Refable<T>, callback: (value: T) => void) {
  refResolver(refable)(
    ref => ref.watchImmediate(callback),
    // getter => ref(getter).watchImmediate(callback),
    callback
  )
};

export function assignAndWatch<T, K extends keyof T>(target: T, key: K, refable: Refable<T[K]>) {
  runAndWatch(refable, value => {
    target[key] = value;
  });
};