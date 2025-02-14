import { isFunction } from "./lodashish";
import { $throw } from "./utils";

export type Primitive = string | number | boolean | null | undefined;

export type Typeguard<G extends T, T = any> = (value: T) => value is G;

export const NOT_SET = Symbol('NOT_SET');
export type NotSet = typeof NOT_SET;
export function NotSet<T>() {
  return NOT_SET as T | NotSet;
};
export type MaybeNotSet<T> = T | NotSet;

export type NotNull<T> = Exclude<T, null>;
export function isNotNull<T>(value: T | null): value is T;
export function isNotNull<T>(value: T): value is NotNull<T>;
export function isNotNull<T>(value: T | null) {
  return value !== null;
};

export type Defined<T> = Exclude<T, undefined>;
export function isDefined<T>(value: T): value is Defined<T> {
  return value !== undefined;
};

export type Undefinable<T> = T | undefined;
export function Undefined<T>(value?: T) {
  return value;
};
export type Undefined<T> = Undefinable<T>;
export const Undefinable = Undefined;

export type Oneple<T> = [T];
export function Oneple<T>(value: T): [T] {
  return [value];
};

const BRAND = Symbol('brand');

export type Branded<Brand, T> = T & { [BRAND]: Brand };

export function brand<Brand, T>(value: T, brand: Brand) {
  return value as Branded<Brand, T>;
};

export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type StringKey<T> = Extract<keyof T, string>;

export function isKeyOf<T extends object>(obj: T, key: keyof any): key is keyof T {
  return key in obj;
};

export type Func<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;

export type NonFunction<T> = T extends Func 
  ? TypingError<'Cannot be a function'>
  : T;

export function NonFunction<T>(value: T) {
  if (isFunction(value)) {
    throw new TypingError('Cannot be a function');
  };
  return value as NonFunction<T>;
};

export type KeyWithValueOfType<TType, TRecord> = {
  [K in keyof TRecord]: TRecord[K] extends TType ? K : never;
}[keyof TRecord];

export type KeyWithValueNotOfType<TType, TRecord> = Exclude<keyof TRecord, KeyWithValueOfType<TType, TRecord>>;

export function asPartial<T extends Record<string, any>>(obj: T): Partial<T> {
  return obj;
};

export type Inferable<TResult, TArg = void> = TResult | ((value: TArg) => TResult);

export function infer<TResult>(inferable: Inferable<TResult, void>): TResult;
export function infer<TResult, TArg>(inferable: Inferable<TResult, TArg>, value: TArg): TResult;
export function infer<TResult, TArg>(inferable: Inferable<TResult, TArg>, value?: TArg) {
  return isFunction(inferable) ? inferable(value as any) : inferable;
};

export function inferer<TResult>(inferable: Inferable<TResult, void>): (value: void) => TResult;
export function inferer<TResult, TArg>(inferable: Inferable<TResult, TArg>): (value: TArg) => TResult;
export function inferer<TResult, TArg>(inferable: Inferable<TResult, TArg>) {
  return isFunction(inferable) ? inferable : () => inferable;
};

// const TypingErrorMarker = Symbol('typescript-error');
// export const TypingError = mutated(
//   <T extends string>(message: T) => (
//     { [TypingErrorMarker]: message }
//   ), {
//     test: (candidate: any): candidate is typeof TypingError =>
//       TypingErrorMarker in candidate
//   }
// );

// export type TypingError<T extends string> = ReturnType<typeof TypingError<T>>;
export class TypingError<T extends string> extends Error {
  constructor(message: T) {
    super(message);
  };
}

// export type TypescriptError<T extends string> = {
//   // readonly __brand: unique symbol;
//   readonly [TypescriptError$]: T;
// };

/**
 * Constructs a type by making properties optional if their type includes `undefined`.
 *
 */
export type OptionalIfUndefinable<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
};

export type OptionalIfNotInBoth<T, U> = {
  [K in keyof T as K extends keyof U ? K : never]: T[K];
} & {
  [K in keyof T as K extends keyof U ? never : K]?: T[K];
} & {
  [K in keyof U as K extends keyof T ? never : K]?: U[K];
};

// export type IfReadonly<K extends keyof T, T, IfYes, IfNo> =
//   IfEquals<{ readonly [P in K]: T[P] }, { [P in K]: T[P] }, IfYes, IfNo>;
export type ReadonlyKey<T> = {
  [K in keyof T]: IfEquals<{ readonly [P in K]: T[P] }, { [P in K]: T[P] }, K, never>;
}[keyof T];

export type IfReadonly<K extends keyof T, T, IfYes, IfNo> = K extends ReadonlyKey<T> ? IfYes : IfNo;

export type IfEquals<X, Y, IfYes, IfNo> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? IfYes : IfNo;

export function isReadonlyKey<T>(key: keyof T, obj: T): key is ReadonlyKey<T> {
  return (
    Object.getOwnPropertyDescriptor(obj, key) ?? $throw(`Property ${String(key)} not found on object`)
  ).writable === false;
}

export function IfReadonly<K extends keyof T, T, IfYes, IfNo>(
  obj: T, key: K, ifYes: () => IfYes, ifNo: () => IfNo
) {
  return isReadonlyKey(key, obj) ? ifYes() : ifNo();
};

export type Reverse<T extends readonly any[]> = 
  T extends readonly [infer First, ...infer Rest] 
    ? readonly [...Reverse<Rest>, First]
    : [];

export function Reverse<T extends readonly any[]>(tuple: T) {
  return [...tuple].reverse() as Reverse<T>;
};