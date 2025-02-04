import { isFunction, mapKeys } from "./lodashish";
import { Defined, Func, infer, Inferable, MaybeNotSet, NotSet, Primitive, StringKey, TypingError, Undefinable } from "./types";

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
  getter: () => V,
  // setter?: (obj: T, value: V) => void,
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

export type CreateBoxArgs<T, TWritable extends boolean> = [
  getterOrValue: T | (() => T),
  setter?: (value: T) => void
];


const CannotSetError = () => new TypingError('Cannot set value on a read-only box');
type CannotSetError = ReturnType<typeof CannotSetError>;

type EnsureWritable<T, TWritable extends boolean> = TWritable extends true ? Defined<T> : CannotSetError;

export function createBox<T, TWritable extends boolean>(...[ getterOrValue, setter ]: CreateBoxArgs<T, TWritable>) {

  if ( !isFunction(getterOrValue) ) {
    let value = getterOrValue;
    return createBoxWithGetter(() => value, setValue => value = setValue);
  } else {
    return createBoxWithGetter(getterOrValue, setter);
  };

  function createBoxWithGetter(getter: () => T, setter?: (value: T) => void) {

    type TSetValue = EnsureWritable<T, TWritable>;

    function box(): T;
    function box(setValue: TSetValue): Defined<T>;
    function box(setValue: (value: T) => TSetValue): T;
    function box(setValue?: Defined<T> | ((value: T) => TSetValue) | TypingError<any>) {
      if ( setValue === undefined ) {
        return getter();
      } else {
        if ( !setter || setValue instanceof TypingError ) {
          throw CannotSetError();
        };
        if ( isFunction(setValue) ) {
          return box(setValue(getter()));
        } else {
          setter(setValue);
          return setValue;
        };
      };
    };
    return box;
  };
  
};

export type GetSetTuple<T> = [ getter: () => T, setter: (value: T) => void ]

export function Box<T>(...args: GetSetTuple<T>): Box<T, true>;
export function Box<T>(getter: () => T): Box<T, false>;
export function Box<T>(value: T): Box<T, true>;

export function Box<T>(...args: CreateBoxArgs<T, boolean>) {
  return createBox(...args);
};

// // quick test
// const box1 = Box(1);
// box1();
// box1(2);
// const box2 = Box(() => "hello");
// box2();
// // @ts-expect-error below because box2 is read-only
// box2("world");
// const toUpperCase = (str: string) => str.toUpperCase();
// // @ts-expect-error same as above
// box2(toUpperCase);
// const box3 = Box(() => "foo", console.log);
// box3();
// // @ts-expect-error below because of type mismatch
// box3(4);
// box3(toUpperCase); // ok, converts the box's value to uppercase

export type Box<T, TWritable extends boolean> = ReturnType<typeof createBox<T, TWritable>>;

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

  const metadata = Metadata<TSubject, Box<TValue, TWritable>>(subject => {
    const [ getter, setter ] = initializer(subject);
    return createBox(getter, setter);
  });
  
  function metabox(subject: TSubject): TValue;
  function metabox(subject: TSubject, setValue: EnsureWritable<TValue, TWritable>): Defined<TValue>;
  function metabox(subject: TSubject, setValue: (value: TValue) => EnsureWritable<TValue, TWritable>): TValue;
  function metabox(subject: TSubject, setValue?: any) {
    return metadata(subject)(setValue);
  };

  return metabox;

};

export type Metabox<TSubject extends WeakKey, TValue, TWritable extends boolean> = ReturnType<typeof createMetabox<TSubject, TValue, TWritable>>;

export function Metabox<TSubject extends WeakKey, TValue>(
  initializer: (subject: TSubject) => TValue
): Metabox<TSubject, TValue, true> {
  return createMetabox((subject: TSubject) => [ initializer(subject) ]);
  // TODO: Implement complex (getter/setter) Metaboxes
};

export function inc(value: number) {
  return value + 1;
};

export function dec(value: number) {
  return value - 1;
};

export function WeakM2MMap<T extends object, U extends object>() {

  const nodeRelatives = new WeakMap<T|U, Set<T> | Set<U>>();

  function self(node: T): Set<U>;
  function self(node: U): Set<T>;
  function self(node: T, addOrRemoveRelative: U, remove?: null): Set<U>;
  function self(node: U, addOrRemoveRelative: T, remove?: null): Set<T>;

  function self(node: T|U, relative?: U|T, remove?: null) {
    const relatives = getOrSet(nodeRelatives, node, new Set());
    if ( relative )
      ([
        [ relatives,                                    relative  ],
        [ getOrSet(nodeRelatives, relative, new Set()), node      ]
      ] as const).forEach(([ relatives, relative ]) =>
        (
          remove === null
            ? relatives.delete
            : relatives.add
        )(relative)
      );
    return relatives;
  };

  return self;


};

export type WeakM2MMap = ReturnType<typeof WeakM2MMap>;