import { isFunction, mapKeys } from "./lodashish";
import { Defined, Func, infer, Inferable, StringKey, TypingError } from "./types";

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

export function addAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: (obj: T) => V,
  // setter?: (obj: T, value: V) => void,
): T & { readonly [K in Key]: V };
export function addAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: (obj: T) => V,
  setter: (obj: T, value: V) => void,
): { [K in Key]: V } & T;

export function addAccessor<T, Key extends string, V>(
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

// export function getOrSet<T extends WeakKey, U>(map: Map<T, U> | WeakMap<T, U>, key: T, defaultValue: Inferable<U, T>) {
export function getOrSet<T extends WeakKey, U>(map: Map<T, U> | WeakMap<T, U>, key: T, defaultValue: Inferable<U, T>): U;
export function getOrSet<T, U>(map: Map<T, U>, key: T, defaultValue: Inferable<U, T>): U;
export function getOrSet<T, U>(map: Map<T, U> | ( T extends WeakKey ? WeakMap<T, U> : never ), key: T, defaultValue: Inferable<U, T>) {
  if ( map.has(key) ) {
    return map.get(key)!;
  };
  const value = infer(defaultValue, key);
  map.set(key, value);
  return value;
};

// export type FunctionalAccessor<T, Readonly extends boolean> = 
// {
//   (): T;
//   (value: Defined<T>): Readonly extends true ? never : T;
// };

export function FunctionalAccessor<T, Setter extends undefined | ((value: T) => void)>(
  getter: () => T,
  setter?: Setter
) {

  function access(): T;
  function access(setValue: 
      Setter extends undefined 
        ? TypingError<'Cannot set value on read-only accessor'>
        : Defined<T>
  ): T;
  function access(value?: T | TypingError<any>) {
    if ( value === undefined ) {
      return getter();
    } else {
      (
        !(value instanceof TypingError)
        && setter 
        || $throw('Cannot set value on read-only accessor')
      )(value as T);
      return value;
    };
  };
  return access;
  
};

export type FunctionalAccessor<T, Setter extends undefined | ((value: T) => void)> = ReturnType<typeof FunctionalAccessor<T, Setter>>;

export class ValueAccessor<TKey extends WeakKey, TValue> {
  
  constructor(
    private map: WeakMap<TKey, TValue>,
    private key: TKey,
    private initValue: Inferable<TValue, TKey>) {
  };

  get value() {
    return getOrSet(this.map, this.key, this.initValue);
  };

  set value(value: TValue) {
    this.map.set(this.key, value);
  };

};

export function Register<TKey extends WeakKey, TValue>(keyFactory: Func<any[], TKey>, initValue: Inferable<TValue, TKey>) {
  const map = new WeakMap<TKey, TValue>();
  return (key: TKey) => new ValueAccessor(map, key, initValue);
};
export type Register<TKey extends WeakKey, TValue> = ReturnType<typeof Register<TKey, TValue>>;