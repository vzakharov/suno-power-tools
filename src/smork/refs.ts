//! Smork, the smol framework
import { isFunction } from "../lodashish";
import { Function } from "../types";

export function ref<T extends {}>(value: Exclude<T, Function>): Ref<T>;
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

export type Watcher<T> = (value: T, oldValue: T) => void;

export class BaseRef<T> {

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

};


export class Ref<T> extends BaseRef<T> {
  
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

let currentComputedPreHandler: ((ref: BaseRef<any>) => void) | undefined = undefined;

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

export function useNot<T>(ref: BaseRef<T>) {
  return computed(() => {
    return !ref.value
  });
};