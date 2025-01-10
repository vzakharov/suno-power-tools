//! Smork, the smol framework
import { isFunction } from "../lodashish";
import { Function } from "../types";

export function ref<T>(value: Exclude<T, Function>): Ref<T>;
export function ref<T>(): Ref<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): BridgedRef<T>;

export function ref<T>(arg1?: T | (() => T), arg2?: (value: T) => void) {
  return isFunction(arg1) 
    // ? new ComputedRef(arg1)
    ? arg2
      ? new BridgedRef(arg1, arg2)
      : new ComputedRef(arg1)
    : new Ref(arg1);
};

/**
 * A ref that can take an undefined value despite being initialized with a value. Useful for initializing refs that are used as models for elements supporting `undefined` values. Used for typing purposes only and does not affect any runtime behavior.
 */
export function uref<T extends {}>(value: T) {
  return new Ref<T | undefined>(value);
};

export type Watcher<T> = (value: T, oldValue: T) => void;

export class ReadonlyRef<T> {

  protected watchers: Watcher<T>[] = [];
  private activeWatchers = new WeakSet<Watcher<T>>();

  constructor(
    protected _value: T
  ) { };

  get() {
    currentComputedPreHandler?.(this);
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
    this.watchers.push(watcher);
  };

  /**
   * @alias watch
   */
  onChange = this.watch; // just an alias

  unwatch(watcher: Watcher<T>) {
    this.watchers = this.watchers.filter(w => w !== watcher);
  };

  get value() {
    return this.get();
  };

  map<U>(getter: (value: T) => U): ComputedRef<U> {
    return new ComputedRef(() => getter(this.value));
  };

  compute = this.map;

  merge<U>(mergee: MaybeRefOrGetter<U> | undefined) {
    return mergee
      ? computed(() => ({
        ...this.value,
        ...deref(mergee)
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
    return new BridgedRef(
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

let currentComputedPreHandler: ((ref: ReadonlyRef<any>) => void) | undefined = undefined;

export class SmorkError extends Error {
  constructor(message: string) {
    super(`smork: ${message}`);
  };
}

export class ComputedRef<T> extends Ref<T> {

  constructor(
    getter: () => T
  ) {
    if ( currentComputedPreHandler ) {
      throw new SmorkError('currentComputedPreHandler is already set (this should never happen)');
    };
    try {
      currentComputedPreHandler = ref => {
        ref.watch(() => this._set(getter()));
      };
      super(getter()); // to register any refs that are used in the getter
    } finally {
      currentComputedPreHandler = undefined;
    };
  };

};

export function computed<T>(getter: () => T) {
  return new ComputedRef(getter);
};

export class BridgedRef<T> extends Ref<T> {
  
  constructor(
    getter: () => T,
    private setter: (value: T) => void
  ) {
    const computedRef = new ComputedRef(getter);
    super(computedRef.value);
    computedRef.watch(value => this._set(value));
  };

  set(value: T) {
    this.setter(value);
    if ( this.value !== value ) {
      throw new SmorkError('bridge value did not change to the one being set');
    };
  };

};

export function bridged<T>(getter: () => T, setter: (value: T) => void) {
  return new BridgedRef(getter, setter);
};

export function useNot(ref: ReadonlyRef<any>) {
  return computed(() => {
    return !ref.value
  });
};

export type RefOrGetter<T> = (() => T) | ReadonlyRef<T>;

export type MaybeRefOrGetter<T> = T | RefOrGetter<T>;

export function isRefOrGetter<T>(value: MaybeRefOrGetter<T>) {
  return isFunction(value) || value instanceof ReadonlyRef;
};

function refResolver<T>(arg: MaybeRefOrGetter<T>) {
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

export function deref<T>(arg: MaybeRefOrGetter<T>) {
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
export function toRef<T>(arg: MaybeRefOrGetter<T>) {
  return refResolver(arg)(
    ref => ref,
    fn => computed(fn),
    value => new ReadonlyRef(value)
  )
};