import { forEach, isFunction, uniqueId } from "../lodashish";
import { Defined, Func, Inferable, NonFunction, NOT_SET, NotSet, TypingError, Undefined } from "../types";
import { Undefinable } from "../types";
import { addAccessor, DataRegister, getOrSet, Register } from "../utils";

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

// let currentComputee = Undefined<Target>();
const computeeStack = [] as Target[];

const refData = DataRegister(Ref<any>, {
  dirtySources: 0,
  iteration: 0,
  targets: () => new Set<Target>(),
});

const [ tarnish, clean ] = [ +1, -1 ].map(
  increment => (target: Target) => {
    const [ ref, iteration ] = target;
    const data = refData(ref);
    if ( data.iteration !== iteration ) {
      data.dirtySources += increment;
      data.targets.forEach(increment === +1 ? tarnish : clean);
    };
  }
);

export function ref<T>(value: NonFunction<T>): Ref<T, { writable: true }>;
export function ref<T>(getter: () => T): Ref<T, { writable: false }>;
export function ref<T>(getter: () => T, setter: (value: T) => void): Ref<T, { writable: true }>;
export function ref<T>(getterOrValue: T | (() => T), setter?: (value: T) => void) {
  return Ref(isFunction(getterOrValue) ? getterOrValue : () => getterOrValue, setter);
};

export function Ref<T>(getter: () => T, setter: Undefinable<(value: T) => void>) {

  const self = <Ref<T, RefOptions>>((
    value?: Defined<T>,
  ) => {

    let cachedValue = NotSet<T>();

    const data = refData(self);
    const { targets } = data;

    if ( value === undefined ) {

      if ( cachedValue === NOT_SET || data.dirtySources ) {

        const target = computeeStack.at(-1);
        target && targets.add(target);

        computeeStack.push([ self, data.iteration++ ]);
        try {
          const newValue = getter();
          if ( newValue === cachedValue ) {
            targets.forEach(clean); // i.e. this value isn't changed, no need to recompute the target at least as far as this source is concerned
          } else {
            cachedValue = newValue;
          };
        } finally {
          computeeStack.pop();
        };

      };

      return cachedValue;

    } else {
      if ( setter === undefined ) {
        throw NonWritableRefError();
      };
      setter(value);
      targets.forEach(tarnish);
      return value;
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