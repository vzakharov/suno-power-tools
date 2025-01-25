import { mapKeys } from "./lodashish";
import { Defined, Func, StringKey } from "./types";

export function ensure<T>(value: T | null | undefined): T {
  if ( value === null || value === undefined ) {
    throw new Error('Value is null or undefined');
  };
  return value;
};


export function Null<T>() {
  return null as T | null;
};

export function Nullable<T>(value?: T) {
  return value ?? null;
}

export function Undefined<T>() {
  return undefined as T | undefined;
};

export function Undefinable<T>(value?: T) {
  return value;
};

export function EmptyArray<T>() {
  return [] as T[];
};

export function $with<T, U>(obj: T, fn: (obj: T) => U): U {
  return fn(obj);
};

export function jsonClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
};

export function mutate<T extends {}, U extends {}>(obj: T, partial: U): asserts obj is T & U {
  Object.assign(obj, partial);
};

export function mutated<T extends {}, U extends {}>(obj: T, partial: U) {
  mutate(obj, partial);
  return obj;
};

let lastCalled = 0;

export function atLeast(milliseconds: number): Promise<void> {
  const timeToWait = Math.max(0, milliseconds - (Date.now() - lastCalled));
  return new Promise((resolve) => {
    setTimeout(() => {
      lastCalled = Date.now();
      resolve();
    }, timeToWait);
  });
};

export function $throw(message: string): never {
  throw new Error(message);
};

export async function uploadTextFile() {
  // Creates a file input element, clicks it, and waits for the user to select a file, then resolves with the file's contents
  const input = document.createElement('input');
  input.type = 'file';
  input.click();
  return new Promise<string | undefined>((resolve) => {
    input.onchange = () => {
      const file = input.files?.[0];
      if ( !file ) {
        return resolve(undefined);
      };
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
        input.remove();
      };
      reader.readAsText(file);
    };
  });
};

export function isoStringToTimestamp(isoString: string | null): number {
  return isoString ? new Date(isoString).getTime() : 0;
};

export function sortByDate<T extends { created_at: string | null }>(items: T[]): T[];

export function sortByDate<T, TDateAccessor extends (item: T) => string | null>(items: T[], dateAccessor: TDateAccessor): T[];

export function sortByDate(items: any[], dateAccessor = (item: any) => item.created_at) {
  return items.sort((a, b) => isoStringToTimestamp(dateAccessor(a)) - isoStringToTimestamp(dateAccessor(b)));
};

export type RenameKeys<
  TRecord extends Record<string, any>,
  TMap extends Partial<Record<StringKey<TRecord>, string>>,
> = {
  [K in StringKey<TRecord>]: K extends keyof TMap ? TMap[K] : K;
};

export function renameKeys<
  TRecord extends Record<string, any>,
  TMap extends Readonly<Partial<Record<StringKey<TRecord>, string>>>,
>(record: TRecord, keyMap: TMap) {
  return mapKeys(record, (key) => keyMap[key as keyof TMap] ?? key) as unknown as RenameKeys<TRecord, TMap>;
};

export function isEqual<T>(compareTo: T) {
  return (value: T) => value === compareTo;
};

export function truthy(value: any) {
  return !!value;
};

export function debug<TFunc extends Func>(fn: TFunc): TFunc;
export function debug<T>(arg: T): T;
export function debug(): void;
export function debug(arg?: any) {
  // debugger;
  // return arg;
  if ( typeof arg === 'function' ) {
    return function(...args: Parameters<typeof arg>) {
      debugger;
      return arg(...args);
    } as any;
  } else {
    debugger;
    return arg;
  };
};

export function doAndReturn<T>(target: T, fn: (target: T) => void) {
  fn(target);
  return target;
};

export function findInSet<T>(set: Set<T>, predicate: (value: T) => boolean) {
  for ( const value of set ) {
    if ( predicate(value) ) {
      return value;
    };
  };
};

export function nextTick() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });
};

// Decorator to log the name, inputs and output of a class method
export function logMethod(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${key} with`, args);
    const result = original.apply(this, args);
    console.log(`Result of ${key} is`, result);
    return result;
  };
  return descriptor;
};

export function withAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: (obj: T) => V,
  // setter?: (obj: T, value: V) => void,
): T & { readonly [K in Key]: V };
export function withAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: (obj: T) => V,
  setter: (obj: T, value: V) => void,
): { [K in Key]: V } & T;

export function withAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: (obj: T) => V,
  setter?: (obj: T, value: V) => void,
) {
  return Object.defineProperty(obj, key, {
    get: () => getter(obj),
    set: setter ? (value: V) => setter(obj, value) : undefined,
  });
};

export function getOrSet<T extends WeakKey, U>(map: Map<T, U> | WeakMap<T, U>, key: T, defaultValue: U) {
  if ( map.has(key) ) {
    return map.get(key)!;
  };
  map.set(key, defaultValue);
  return defaultValue;
};

export function FunctionAccessor<T>(getter: () => T, setter: (value: T) => void) {
  function access(): T;
  function access(value: T): void;
  function access(value?: T) {
    if ( arguments.length ) {
      setter(value as T);
    } else {
      return getter();
    };
  };
  return access;
};

export type FunctionAccessor<T> = ReturnType<typeof FunctionAccessor<T>>;

export function WrappedRegister<TKey extends WeakKey, TValue>() {

  const register = new WeakMap<TKey, TValue>();

  function wrappedAccessor(key: TKey) {

    function init<T extends TValue>(defaultValue: T) {

      return FunctionAccessor<T>(
        () => getOrSet(register, key, defaultValue) as T,
        value => register.set(key, value)
      );

    };

    return init;
  };

  function fullAccessor<T extends TValue>(key: TKey, defaultValue: T) {
    return wrappedAccessor(key)(defaultValue);
  };

  function accessor(key: TKey): ReturnType<typeof wrappedAccessor>;
  function accessor<T extends TValue>(key: TKey, defaultValue: T): ReturnType<typeof fullAccessor<T>>;
  function accessor(key: TKey, defaultValue?: TValue) {
    return arguments.length === 1 ? wrappedAccessor(key) : fullAccessor(key, defaultValue!);
  };

  return accessor;

};
export type WrappedRegister<TKey extends WeakKey, TValue> = ReturnType<typeof WrappedRegister<TKey, TValue>>;

export function InitableRegister<TKey extends WeakKey, TValue>(initValue: () => TValue) {
  const register = WrappedRegister<TKey, TValue>();
  return (key: TKey) => register(key, initValue());
};
export type ValuedRegister<TKey extends WeakKey, TValue> = ReturnType<typeof InitableRegister<TKey, TValue>>;

export function Register<TKey extends WeakKey, TValue>(): WrappedRegister<TKey, TValue>;
export function Register<TKey extends WeakKey, TValue>(key: Func<any[], TKey>, initValue: () => TValue): ValuedRegister<TKey, TValue>;
export function Register<TKey extends WeakKey, TValue>(initValue?: () => TValue) {
  return initValue ? InitableRegister(initValue) : WrappedRegister();
};

export function MetaRegister<TValue = any>() {
  const register = WrappedRegister<Symbol, TValue>();
  return register(Symbol());
};

export type MetaRegister<TValue> = ReturnType<typeof MetaRegister<TValue>>;