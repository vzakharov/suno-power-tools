import { isFunction, mapKeys } from "./lodashish";
import { Func, infer, Inferable, StringKey } from "./types";

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

export function $throw(message?: string): never {
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

export function beforeReturning<T>(target: T, preprocess: (target: T) => void) {
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

// export function nextTick() {
//   return new Promise<void>(resolve => {
//     setTimeout(resolve, 0);
//   });
// };
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
  getterOrValue: T | (() => T),
  setter?: TWritable extends true ? (value: T) => void : never
];


export function createBox<T, TWritable extends boolean>(...[ getterOrValue, setter ]: CreateBoxArgs<T, TWritable>) {

  if ( !isFunction(getterOrValue) ) {
    let value = getterOrValue;
    return createBoxWithGetter(() => value, setValue => value = setValue);
  } else {
    return createBoxWithGetter(getterOrValue, setter);
  };

  function createBoxWithGetter(getter: () => T, setter?: (value: T) => void) {

    return (
      function box(setValue?: T | ((value: T) => T)) {
        if ( setValue === undefined ) {
          return getter();
        } else {
          if ( !setter ) {
            throw new TypeError('Cannot set value on a read-only box');
          };
          if ( isFunction(setValue) ) {
            return box(setValue(getter()));
          } else {
            setter(setValue);
            return setValue;
          };
        };
      }
    ) as ParametricBox<T, TWritable>;
  };
  
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

export type ReadonlyBox<T> = () => T;

export type Box<T = unknown> = {
  (): T,
  (setValue: T | ((value: T) => T)): T,
};

export function Metadata<TSubject extends WeakKey, TMetadata extends Record<string, any>>(initializer: (subject: TSubject) => TMetadata) {
  const metadatas = new WeakMap<TSubject, TMetadata>();
  return (subject: TSubject) => getOrSet(metadatas, subject, () => initializer(subject));
};

export type Metadata<TSubject extends WeakKey, TInits extends Record<string, any>> = ReturnType<typeof Metadata<TSubject, TInits>>;

export function createMetabox<
  TSubject extends WeakKey,
  TValue,
  TWritable extends boolean,
>(
  initializer: (subject: TSubject) => CreateBoxArgs<TValue, TWritable>
) {

  const metadata = Metadata<TSubject, ParametricBox<TValue, TWritable>>(subject => {
    const [ getter, setter ] = initializer(subject);
    return createBox(getter, setter);
  });
  
  function metabox(subject: TSubject, setValue?: TValue | ((value: TValue) => TValue)) {
    return setValue ? metadata(subject)(setValue) : metadata(subject)();
  };

  return metabox as ParametricMetabox<TSubject, TValue, TWritable>;

};

export type ParametricMetabox<TSubject extends WeakKey, TValue, TWritable extends boolean> =
  TWritable extends true
    ? Metabox<TSubject, TValue>
    : ReadonlyMetabox<TSubject, TValue>;

export interface ReadonlyMetabox<TSubject extends WeakKey, TValue> {
  (subject: TSubject): TValue;
};

export type Metabox<TSubject extends WeakKey, TValue> = ReadonlyMetabox<TSubject, TValue> & {
  (subject: TSubject, setValue: TValue | ((value: TValue) => TValue)): TValue;
};

export function Metabox<TSubject extends WeakKey, TValue>(
  initializer: (subject: TSubject) => TValue
): Metabox<TSubject, TValue> {
  return createMetabox((subject: TSubject) => [ initializer(subject) ]);
  // TODO: Implement complex (getter/setter) Metaboxes
};

export function inc(value: number) {
  return value + 1;
};

export function dec(value: number) {
  return value - 1;
};

export function WeakBiMap<T extends object, U extends object>() {

  const relations = new WeakMap<T|U, Set<T> | Set<U>>();

  function self(node: T): readonly U[];
  function self(node: U): readonly T[];
  function self(node: T, removeNode: null): void;
  function self(node: U, removeNode: null): void;
  function self(node: T, addOrRemoveRelative: U, remove?: null): readonly U[];
  function self(node: U, addOrRemoveRelative: T, remove?: null): readonly T[];
  function self(...args: Parameters<typeof updateRelations>) {
    return updateRelations(...args);
  };

  function updateRelations(node: T|U, relative?: U|T|null, remove?: null) {
    const relatives = getOrSet(relations, node, new Set());
    if ( relative === null ) {
      relatives.forEach(relative =>
        updateRelations(relative, node, null)
      );
    } else if ( relative )
      ([
        [ relatives,                                    relative  ],
        [ getOrSet(relations, relative, new Set()), node      ]
      ] as const).forEach(([ relatives, relative ]) =>
        remove === null
          ? relatives.delete(relative)
          : relatives.add(relative)
      );
    return [ ...relatives ] as const;
  };

  return self;

};

export type WeakBiMap = ReturnType<typeof WeakBiMap>;

const TYPE_MARKER = Symbol('typeMarker');

export type TypeMarked<TDescription extends string | symbol> = {
  readonly [TYPE_MARKER]: TDescription;
};

export function typeMark<TDescription extends string | symbol, T>(description: TDescription, value: T) {
  return Object.defineProperty(value, TYPE_MARKER, { value: description }) as T & TypeMarked<TDescription>;
};

export function typeMarkTester<TDescription extends string | symbol>(description: TDescription) {

  return function test(value: any): value is TypeMarked<TDescription> {
    return value && typeof value === 'object' && TYPE_MARKER in value && value[TYPE_MARKER] === description;
  };
  
};

export function combinedTypeguard<T, G1 extends T, G2 extends T>(guard1: (value: T) => value is G1, guard2: (value: T) => value is G2) {
  return (value: T): value is G1 | G2 => guard1(value) || guard2(value);
};