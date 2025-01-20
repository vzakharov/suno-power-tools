import { Func, StringKey } from "./types";

export function find<T extends {}, U extends Partial<T>>(arr: T[], filter: U) {
  return arr.find(createPredicate(filter));
}

export function filter<T extends {}, U extends Partial<T>>(arr: T[], filter: U) {
  return arr.filter(createPredicate(filter));
};

export function createPredicate<T extends {}, U extends Partial<T>>(filter: U) {
  return function(item: T): item is T & U {
    return Object.entries(filter).every(([key, value]) => item[key] === value);
  }
};

let lastId = 0;

export function uniqueId(prefix = '') {
  return `${prefix}${++lastId}`;
};

export function mapValues<
  T extends Record<string, any>,
  V
>(obj: T, mapper: (value: T[StringKey<T>], key: StringKey<T>) => V) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, mapper(value, key as StringKey<T>)])
  ) as {
    [K in StringKey<T>]: V;
  };
};

export function forEach<T extends Record<string, any>>(
  obj: T,
  callback: (value: T[StringKey<T>], key: StringKey<T>) => void
) {
  return mapValues(obj, callback);
};

/**
 * Creates a union type that maps object properties to a standardized key-value pair structure.
 * 
 * @template T - The type of object to create key-value pairs from
 * @returns A union type where each member represents a key-value pair with:
 *          - `key`: Property name from the original object (type K)
 *          - `value`: Corresponding property value (type T[K])
 * 
 * @example
 * ```typescript
 * type Person = { name: string, age: number };
 * type PersonKeyValue = KeyValueMapper<Person>;
 * // Results in: { key: "name", value: string } | { key: "age", value: number }
 * ```
 */
export type KeyValueMapper<T> = {
  [K in keyof T]: { key: K; value: T[K] }
}[keyof T];

/**
 * Similar to `map`, but treats each item as a { key, value } object, which is useful when your objects are intersections of different types of records.
 */
export function mapzilla<T extends {}, U>(obj: T, callback: (item: KeyValueMapper<T>) => U) {
  return Object.entries(obj).map(([key, value]) => callback({ key, value } as any));
};

export function mapKeys<
  T extends Record<string, any>,
  K extends string
>(
  obj: T, 
  mapper: ( (key: StringKey<T>, value: T[StringKey<T>]) => K )) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [mapper(key as StringKey<T>, value), value])
  ) as {
    [OldKey in StringKey<T> as K]: T[OldKey];
  };
};

export function isFunction<T, F extends Func>(value: T | F): value is F;
export function isFunction(value: any): value is Func;
export function isFunction(value: any) {
  return typeof value === 'function';
};

export function identity<T>(value: T) {
  return value;
};

export function assign<T extends {}, U extends {}>(obj: T, partial: U) {
  return Object.assign(obj, partial) as T & U;
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
};

export function compact<T>(arr: (T | null | undefined)[]) {
  return arr.filter(Boolean) as T[];
};

export function isNil(value: any): value is null | undefined {
  return value === null || value === undefined;
};