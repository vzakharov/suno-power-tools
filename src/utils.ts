import { isFunction, isMutable, isObject, mapKeys } from "./lodashish";
import { Singleton } from "./singletons";
import { Defined, Func, infer, Inferable, isDefined, NonFunction, StringKey, Typeguard, Undefinable } from "./types";

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

export type CreateBoxArgs<T, TWritable extends boolean> = [
  getterOrValue: T | ((oldValue: Undefinable<T>) => T),
  setter?: TWritable extends true ? (value: Defined<T>, oldValue: Undefinable<T>) => void : never
];

export type ValueSetter<T> = Defined<T> | ((value: T, oldValue: Undefinable<T>) => Defined<T>);

export function createBox<T, TWritable extends boolean>(...[ getterOrValue, setter ]: CreateBoxArgs<T, TWritable>) {

  let oldValue = isFunction(getterOrValue) ? undefined as T : getterOrValue;

  function getCurrentValue() {
    return isFunction(getterOrValue) ? getterOrValue(oldValue) : oldValue;
  };


  return (
    function box(setValue?: ValueSetter<T>) {
      if ( setValue === undefined ) {
        return oldValue = getCurrentValue();
      } else {
        if ( !setter ) {
          throw new TypeError('Cannot set value on a read-only box');
        };
        if ( isFunction(setValue) ) {
          return box(setValue(getCurrentValue(), oldValue));
        } else {
          setter(setValue, oldValue);
          return oldValue = setValue;
        };
      };
    }
  ) as ParametricBox<T, TWritable>;
    
};

export type GetSetTuple<T> = [ getter: () => T, setter: (value: T) => void ]

export function Box<T>(getter: () => T): ReadonlyBox<T>;
export function Box<T>(value: T): Box<T>;
export function Box<T>(...args: CreateBoxArgs<T, true>): Box<T>;

export function Box<T>(...args: CreateBoxArgs<T, boolean>) {
  return createBox(...args);
};

export type ParametricBox<T, TWritable extends boolean> =
  TWritable extends true 
    ? Box<T> 
    : ReadonlyBox<T>;

export type ReadonlyBox<T = unknown> = () => T;

export type Box<T = unknown> = {
  (): T,
  (setValue: ValueSetter<T>): T,
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

export function createMetabox<
  TSubject extends WeakKey,
  TValue,
  TWritable extends boolean,
>(
  initializer: (subject: TSubject) => CreateBoxArgs<NonFunction<TValue>, TWritable>
) {

  const metadata = Metadata<TSubject, ParametricBox<NonFunction<TValue>, TWritable>>(subject => {
    const [ getter, setter ] = initializer(subject);
    return createBox(getter, setter);
  });
  
  function metabox<T extends TValue>(subject: TSubject): T;
  function metabox<T extends TValue>(subject: TSubject, setValue: ValueSetter<NonFunction<T>>): T;
  function metabox(subject: TSubject, setValue?: ValueSetter<NonFunction<TValue>>) {
    return isDefined(setValue) ? metadata(subject)(setValue) : metadata(subject)();
  };

  return metabox as ParametricMetabox<TSubject, TValue, TWritable>;

};

export type ParametricMetabox<TSubject extends WeakKey, TValue, TWritable extends boolean> =
  TWritable extends true
    ? Metabox<TSubject, TValue>
    : ReadonlyMetabox<TSubject, TValue>;

export interface ReadonlyMetabox<TSubject extends WeakKey, TValue> {
  <T extends TValue>(subject: TSubject): T;
};

export type Metabox<TSubject extends WeakKey, TValue> = ReadonlyMetabox<TSubject, TValue> & {
  <T extends TValue>(subject: TSubject, setValue: ValueSetter<T>): T;
};

export function Metabox<TSubject extends WeakKey, TValue>(
  initializer: (subject: TSubject) => Defined<NonFunction<TValue>>
): Metabox<TSubject, TValue>;
export function Metabox<TSubject extends WeakKey, TValue>(
  getter: Undefinable<(subject: TSubject) => Defined<NonFunction<TValue>>>,
  setter: (subject: TSubject, value: Defined<NonFunction<TValue>>) => void
): Metabox<TSubject, TValue>;

export function Metabox<TSubject extends WeakKey, TValue>(
  getterOrInitializer: Undefinable<(subject: TSubject) => Defined<NonFunction<TValue>>>,
  setter?: (subject: TSubject, value: Defined<NonFunction<TValue>>) => void
) {
  return createMetabox<TSubject, TValue, true>(
    subject => [
      getterOrInitializer?.(subject) ?? undefined as NonFunction<TValue>,
      setter && ( value => setter(subject, value) )
    ]
  )
};

export function inc(value: number) {
  return value + 1;
};

export function dec(value: number) {
  return value - 1;
};

export type TypeMarked<Marker extends symbol> = {
  readonly [M in Marker]: true;
};

export function TypeMarked<Marker extends symbol, T extends {}>(marker: Marker, value: T) {
  return mutated(value, { [marker]: true }) as T & TypeMarked<Marker>;
};

export function typeMarkTester<Marker extends symbol>(marker: Marker): Typeguard<TypeMarked<Marker>>;
export function typeMarkTester<T extends TypeMarked<any>>(marker: T extends TypeMarked<infer M> ? M : never): Typeguard<T>;
export function typeMarkTester<Marker extends symbol>(marker: Marker) {
  
  return function test(value: any): value is TypeMarked<Marker> {
    return value 
      && ['object', 'function'].includes(typeof value)
      && marker in value 
      && value[marker] === true;
  };
  
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