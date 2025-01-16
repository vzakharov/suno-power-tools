const BRAND = Symbol('brand');

export type Branded<Brand, T> = T & { [BRAND]: Brand };

export function brand<Brand, T>(value: T, brand: Brand) {
  return value as Branded<Brand, T>;
};

export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type StringKey<T> = Extract<keyof T, string>;

export type Func<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;

export type KeyWithValueOfType<TType, TRecord> = {
  [K in keyof TRecord]: TRecord[K] extends TType ? K : never;
}[keyof TRecord];

export function asPartial<T extends Record<string, any>>(obj: T): Partial<T> {
  return obj;
};