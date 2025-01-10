const BRAND = Symbol('brand');

export type Branded<Brand, T> = T & { [BRAND]: Brand };

export function brand<Brand, T>(value: T, brand: Brand) {
  return value as Branded<Brand, T>;
};

export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type StringKey<T> = Extract<keyof T, string>;

export type Function<TReturn = any, TArgs extends any[] = any[]> = (...args: TArgs) => TReturn;

export type KeyWithValueOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];