//! Smork, the smol framework
import { isFunction } from "../lodashish";
import { Function } from "../types";

export function ref<T extends {}>(value: Exclude<T, Function>): Ref<T>;
export function ref<T>(): Ref<T | undefined>;
export function ref<T>(getter: () => T): ComputedRef<T>;

export function ref<T>(arg?: T | (() => T)) {
  return isFunction(arg) 
    ? new ComputedRef(arg)
    : new Ref(arg);
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

  // map<U>(getter: (value: T) => U): ComputedRef<U>;
  // map<K extends keyof T>(key: K): ComputedRef<T[K]>;
  // map(arg: ((value: T) => any) | keyof T) {
  //   return isFunction(arg) 
  //     ? new ComputedRef(() => arg(this.get()))
  //     : new ComputedRef(() => this.get()[arg]);
  // };
  // Let's remove the key-based mapping for now, until/unless we find a use case for it
  map<U>(getter: (value: T) => U): ComputedRef<U> {
    return new ComputedRef(() => getter(this.get()));
  };

};


export class Ref<T> extends BaseRef<T> {
  
  set = super._set;

  set value(value: T) {
    this.set(value);
  };

  get value() {
    return this.get();
  };

};

// const computedPreHandlers: Array<(ref: BaseRef<any>) => void> = [];
let currentComputedPreHandler: ((ref: BaseRef<any>) => void) | undefined = undefined;

export class ComputedRef<T> extends BaseRef<T> {

  refresh() {
    this._set(this.getter());
  };

  constructor(
    private getter: () => T
  ) {
    if ( currentComputedPreHandler ) {
      throw new Error('smork: currentComputedPreHandler is already set (this should never happen)');
    };
    try {
      currentComputedPreHandler = ref => {
        ref.watch(() => this.refresh());
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

export function useNot<T>(ref: BaseRef<T>) {
  return computed(() => {
    return !ref.value
  });
};