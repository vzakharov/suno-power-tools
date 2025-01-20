//! Smork, the smol framework
import { assign, isFunction, mapValues } from "../lodashish";
import { Func } from "../types";
import { $with } from "../utils";

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

  onceDefined(callback: (value: NonNullable<T>) => void) {
    const wrapped = (value: T) => {
      if ( value ) {
        this.unwatch(wrapped);
        callback(value);
      };
    };
    this.watchImmediate(wrapped);
  };

  setter(setter = (value: T) => this._set(value)) {
    return new SetterRef(this, setter);
  };

};

export class MappedRef<T, U> extends Ref<U> {
  
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


export type Refable<T> = T | Ref<T> //| (() => T) ;
export type Unref<TRefable> = 
  TRefable extends Ref<infer T> 
    ? T 
  // : TRefable extends () => infer T
  //   ? T
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

export function unref<T>(refable: Refable<T>): T;
export function unref<T>(refable: T extends Ref<infer U> ? Ref<U> : T): T extends Ref<infer U> ? U : T;
export function unref<T>(refable: Refable<T>) {
  return refable instanceof Ref ? refable.value : refable;
};

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