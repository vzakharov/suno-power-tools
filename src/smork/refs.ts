//! Smork, the smol framework
import { isFunction, mapValues } from "../lodashish";
import { Functional } from "../types";

export class SmorkError extends Error {
  constructor(message: string) {
    super(`smork: ${message}`);
  };
};

export function ref<T>(value: Exclude<T, Functional>): Ref<T>;
export function ref<T>(): Ref<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;

export function ref<T>(valueOrGetter?: T | (() => T), setter?: (value: T) => void) {
  return isFunction(valueOrGetter) 
    ? computed(valueOrGetter, setter)
    : new Ref(valueOrGetter);
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class ReadonlyRef<T> {

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

  map<U>(getter: (value: T) => U): ComputedRef<U> {
    return new ComputedRef(() => getter(this.value));
  };

  compute = this.map;

  merge<U>(mergee: Refable<U> | undefined) {
    return mergee
      ? computed(() => ({
        ...this.value,
        ...unref(mergee)
      }))
      : this;
  };
};


export class Ref<T> extends ReadonlyRef<T> {
  
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

export function assignTo<T>(ref: Ref<T>) {
  return (value: T) => {
    ref.set(value);
  };
};

let currentComputedTracker: ((ref: ReadonlyRef<any>) => void) | undefined = undefined;

export class ComputedRef<T> extends Ref<T> {

  private dependencies = new Set<ReadonlyRef<any>>();

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

export class WritableComputedRef<T> extends Ref<T> {

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


export function useNot(ref: ReadonlyRef<any>) {
  return computed(() => {
    return !ref.value
  });
};

export type Refable<T> = T | (() => T) | ReadonlyRef<T>;
export type Unref<TRefable> = 
  TRefable extends ReadonlyRef<infer T> 
    ? T 
  : TRefable extends () => infer T
    ? T
  : TRefable;
export type Refables<T extends Record<string, any>> = {
  [K in keyof T]: Refable<Required<T>[K] | undefined>
};

export function unrefs<T extends Refables<any>>(refs: Refables<T>) {
  return mapValues(refs, unref) as {
    [K in keyof T]: Unref<T[K]>
  }
};

export type Unrefs<T extends Refables<any>> = ReturnType<typeof unrefs<T>>;

export function isRefOrGetter<T>(value: Refable<T>) {
  return isFunction(value) || value instanceof ReadonlyRef;
};

function refResolver<T>(arg: Refable<T>) {
  return <U>(ifRef: (ref: ReadonlyRef<T>) => U, ifFunction: (fn: () => T) => U, ifValue: (value: T) => U) => {
    return (
      arg instanceof ReadonlyRef
        ? ifRef(arg)
      : isFunction(arg)
        ? ifFunction(arg)
      : ifValue(arg)
    )
  }
}

export function unref<T>(arg: Refable<T>) {
  return refResolver(arg)(
    ref => ref.value,
    fn => fn(),
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
    fn => computed(fn),
    value => new ReadonlyRef(value)
  )
};