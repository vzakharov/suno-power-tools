import { forEach, isFunction, uniqueId } from "../lodashish";
import { Defined, Func, Inferable, NonFunction, TypingError, Undefined } from "../types";
import { Undefinable } from "../types";
import { addAccessor, getOrSet, Register } from "../utils";

export const NonWritableRefError = () => new TypingError('Cannot write to a non-writable ref');
export type NonWritableRefError = ReturnType<typeof NonWritableRefError>;

export type RefOptions = {
  writable: boolean;
};

export type Ref<T, Options extends RefOptions> = {
  (): T,
  (value: Options['writable'] extends true ? Defined<T> : NonWritableRefError): T, // we return the value when setting
  // <U>(transform: Func<[now: T, before: T], U>): Ref<U, { writable: false }>,
  // <U>(transform: Func<[now: T, before: T], U>, backTransform: Func<[now: U, before: U], T>): Ref<U, { writable: true }>,
};

export type AnyRef = Ref<any, RefOptions>;

type Target = [
  ref: AnyRef,
  iteration: number,
];

let currentComputee = Undefined<Target>();
// const computeeIteration = new WeakMap<AnyRef, Symbol>();

const dirtySources = Register(Ref<any>, 0);
const computeeIteration = Register(Ref<any>, 0);
const targetRegister = Register(Ref<any>, () => new Set<Target>());

function tarnish(target: Target) {
  const [ ref, iteration ] = target;
  if ( computeeIteration(ref).value !== iteration ) {
    dirtySources(ref).value++;
    targetRegister(ref).value.forEach(tarnish);
  };
}

export function ref<T>(value: NonFunction<T>): Ref<T, { writable: true }>;
export function ref<T>(getter: () => T): Ref<T, { writable: false }>;
export function ref<T>(getter: () => T, setter: (value: T) => void): Ref<T, { writable: true }>;
export function ref<T>(getterOrValue: T | (() => T), setter?: (value: T) => void) {
  return Ref(isFunction(getterOrValue) ? getterOrValue : () => getterOrValue, setter);
};

export function Ref<T>(getter: () => T, setter: Undefinable<(value: T) => void>) {

  // const targets = new Set<Target>();
  // recomputees.add(self);

  const self = <Ref<T, RefOptions>>((
    value?: Defined<T>,
  ) => {

    const targets = targetRegister(self).value;

    if ( value === undefined ) {

      function get() {
      };

      if ( currentComputee ) {
        targets.add(currentComputee);
        return get()
      } else {
        currentComputee = [ self, computeeIteration(self).value++ ];
        try {
          return get();
        } finally {
          currentComputee = undefined; // in case something goes wrong, we want to make sure we don't leave it in a bad state
        }
      };

    } else {
      if ( setter === undefined ) {
        throw NonWritableRefError();
      };
      setter(value);
      targets.forEach(tarnish);
    };

  });

  return self;

};

// // some tests

// const number = Ref(3)
// // Inferred:
// // const number: Ref<number, {
// //   writable: true;
// // }>
// console.log(number()); // 3
// number(4);
// console.log(number()); // 4

// const string = number(String);
// // const string: Ref<string, {
// //   writable: false;
// // }>
// console.log(string()); // "4"
// try {
//   // @ts-expect-error
//   string("5");
// } catch (e) { console.log(e.message) } // Cannot write to a non-writable ref

// const twoWayString = number(String, Number);
// // const twoWayString: Ref<string, {
// //   writable: true;
// // }>
// twoWayString("5"); // Ok because we can write to it
// console.log(twoWayString()); // "5"

// // additional bonus
// const boolean = Ref(false);
// if ( !boolean ) { // <-- easily seen as a mistake because it's highlighted as a function
//   console.log("You forgot to call the ref");
// }