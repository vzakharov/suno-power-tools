import { isFunction } from "./lodashish";
import { mutated } from "./utils";

export const NOT_SET = Symbol('NOT_SET');
export type NotSet = typeof NOT_SET;
export function NotSet<T>() {
  return NOT_SET as NotSet | T;
}

export type Defined<T> = Exclude<T, undefined>;
export type Undefinable<T> = T | undefined;
export function Undefined<T>(value?: T) {
  return value;
};
export type Undefined<T> = Undefinable<T>;
export const Undefinable = Undefined;

const BRAND = Symbol('brand');

export type Branded<Brand, T> = T & { [BRAND]: Brand };

export function brand<Brand, T>(value: T, brand: Brand) {
  return value as Branded<Brand, T>;
};

export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type StringKey<T> = Extract<keyof T, string>;

export type Func<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;

export type NonFunction<T> = T extends Func ? never : T;

export type KeyWithValueOfType<TType, TRecord> = {
  [K in keyof TRecord]: TRecord[K] extends TType ? K : never;
}[keyof TRecord];

export function asPartial<T extends Record<string, any>>(obj: T): Partial<T> {
  return obj;
};

export type Inferable<TResult, TArg = void> = TResult | ((value: TArg) => TResult);

export function infer<TResult>(inferable: Inferable<TResult, void>): TResult;
export function infer<TResult, TArg>(inferable: Inferable<TResult, TArg>, value: TArg): TResult;
export function infer<TResult, TArg>(inferable: Inferable<TResult, TArg>, value?: TArg) {
  return isFunction(inferable) ? inferable(value as any) : inferable;
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