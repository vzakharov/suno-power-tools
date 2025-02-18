import { isMutable, mapKeys } from "./lodashish";
import { Singleton } from "./singletons";
import { Func, infer, Inferable, StringKey, TypingError } from "./types";

export function ensure<T>(value: T | null | undefined): T {
  if ( value === null || value === undefined ) {
    throw new Error('Value is null or undefined');
  };
  return value;
};

export function Null<T>() {
  return null as T | null;
};

export type Null<T> = T | null;

export function Nullable<T>(value?: T) {
  return value ?? null;
}

export function EmptyArray<T>() {
  return [] as T[];
};
export type EmptyArray<T> = T[];

// export function EmptyTuple<TLength extends number>() {
export function EmptyTuple<TTuple extends readonly any[]>(): {
  [K in keyof TTuple]?: undefined extends TTuple[K] ? TTuple[K] : TypingError<'Cannot create an empty tuple for a tuple expecting defined values'>;
};
export function EmptyTuple<TLength extends number>(): TupleOfLength<TLength>;
export function EmptyTuple() {
  return [];
};

export type EmptyTuple<TLength extends number> = TupleOfLength<TLength, undefined>;

export function $with<TArgs extends any[], TResult>(...arg: [...arg: TArgs, callback: (...arg: TArgs) => TResult]) {
  return ( arg.pop() as (...args: TArgs) => TResult )(...arg as unknown as TArgs);
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

export function $throw(message?: string): never;
export function $throw(error: Error): never;
export function $throw(messageOrError?: string | Error) {
  throw messageOrError instanceof Error ? messageOrError : new Error(messageOrError);
};

type $Throw = typeof $throw;

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

export function tap<T>(target: T, preprocess: (target: T) => void) {
  preprocess(target);
  return target;
};

export function findInSet<T>(set: Set<T>, predicate: (value: T) => boolean) {
  for ( const value of set ) {
    if ( predicate(value) ) {
      return value;
    };
  };
};

export function nextTick(): Promise<void>;
export function nextTick<T>(callback: () => T): Promise<T>;
export function nextTick<T>(callback?: () => T) {
  return new Promise<T | void>(resolve => {
    setTimeout(() => {
      resolve(callback?.());
    }, 0);
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
  getter: () => V,
): T & { readonly [K in Key]: V };
export function addAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  getter: () => V,
  setter: (value: V) => void,
): { [K in Key]: V } & T;

export function addAccessor<T, Key extends string, V>(
  obj: T,
  key: Key,
  get: () => V,
  set?: (value: V) => void,
) {
  return Object.defineProperty(obj, key, {
    get,
    set
  });
};

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

export function Metadata<TSubject extends WeakKey, TMetadata extends Record<string, any>>(initializer: (subject: TSubject) => TMetadata) {
  const metadatas = new WeakMap<TSubject, TMetadata>();

  function maybeSingleton(subject: TSubject) {
    return Array.isArray(subject) && subject.every(isMutable)
      ? Singleton.by(...subject)(() => subject) 
      : subject;
  }

  return (subject: TSubject) => 
      getOrSet(
        metadatas,
        maybeSingleton(subject),
        () => initializer(subject)
      );

};

export type Metadata<TSubject extends WeakKey, TInits extends Record<string, any>> = ReturnType<typeof Metadata<TSubject, TInits>>;

export type TupleOfLength<T extends number, U = any, R extends U[] = []> = 
  R['length'] extends T ? R : TupleOfLength<T, U, [...R, U]>;

export type Inc<N extends number, D extends number = 1> = 
  N extends infer I ? I extends number 
    ? [...TupleOfLength<I>, ...TupleOfLength<D>]['length'] 
    : never : never;

export function inc<N extends number>(value: N): Inc<N>;
export function inc<N extends number, D extends number>(value: N, delta: D): Inc<N, D>;
export function inc(value: number, delta = 1) {
  return value + delta;
};

export type Dec<N extends number, D extends number = 1> = 
  N extends infer I ? I extends number
    ? TupleOfLength<I> extends [...TupleOfLength<D>, ...infer Rest]
      ? Rest['length']
      : never : never : never;

export function dec<N extends number>(value: N): Dec<N>;
export function dec<N extends number, D extends number>(value: N, delta: D): Dec<N, D>;
export function dec(value: number, delta = 1) {
  return value - delta;
};

export function combinedTypeguard<T, G1 extends T, G2 extends T>(guard1: (value: T) => value is G1, guard2: (value: T) => value is G2) {
  return (value: T): value is G1 | G2 => guard1(value) || guard2(value);
};

export function $try<T>(fn: () => T): T;
export function $try<T>(fn: () => T, fallback: (e: Error) => void): T | undefined;
export function $try<T>(fn: () => T, fallback: Inferable<T, Error>): T;
export function $try<T>(fn: () => T, fallback?: Inferable<T | undefined, Error>) {
  try {
    return fn();
  } catch ( e: any ) {
    return fallback ? infer(fallback, e) : $throw(e);
  }
};

export function itselfIf<TValue, TGuarded extends TValue, TElse>(
  value: TValue,
  guard: (value: TValue) => value is TGuarded,
  otherwise: Inferable<TElse, TValue>
) {
  return guard(value) ? value : infer(otherwise, value);
};

export type First<TTuple extends readonly any[]> = TTuple extends readonly [infer T, ...any[]] ? T : never;
export function first<TTuple extends readonly any[]>(tuple: TTuple): First<TTuple> {
  return tuple[0];
};

export type Last<TTuple extends readonly any[]> = TTuple extends readonly [...any[], infer T] ? T : never;
export function last<TTuple extends readonly any[]>(tuple: TTuple): Last<TTuple> {
  return tuple[tuple.length - 1];
};

export type OnlyOne<TTuple extends readonly any[]> = 
  TTuple extends readonly [infer T] 
    ? T 
    : TypingError<'Expected a tuple with exactly one element'>;

export function onlyOne<TTuple extends readonly any[]>(item: OnlyOne<TTuple>) {
  return [item] as unknown as TTuple;
}