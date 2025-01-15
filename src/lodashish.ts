import { Functional, StringKey } from "./types";

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

export function isFunction(value: any): value is Functional {
  return typeof value === 'function';
};

export function identity<T>(value: T) {
  return value;
};

export function assign<T extends {}, U extends {}>(obj: T, partial: U) {
  return Object.assign(obj, partial) as T & U;
}