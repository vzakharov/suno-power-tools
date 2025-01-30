import { isFunction, uniqueId } from "../lodashish";
import { Defined, Inferable, NonFunction, NOT_SET, NotSet, Primitive, TypingError, Undefinable, Undefined } from "../types";
import { Metabox, Metadata } from "../utils";

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

type Target = readonly [
  ref: AnyRef,
  iteration: number,
];

// // let currentComputee = Undefined<Target>();
// const computeeStack = [] as Target[];

// const metadata = Metadata((ref: AnyRef) => ({
//   id: uniqueId('ref-'),
//   dirtiness: 0,
//   iteration: 0,
//   targets: new Set<Target>(),
//   alreadyTarnished: false,
// }));

const isClean = Metabox((ref: AnyRef) => false);
// const isClean = Refbox(undefined as undefined | boolean);

const someRef = Ref(3);
isClean(someRef)(); // false
isClean(someRef)(true); // true



const [ tarnish, clean ] = [ +1, -1 ].map(
  increment => ( target: Target ) => (
    function handle(target: Target, handled = new WeakSet<Target>()) {
      const [ targetRef, iteration ] = target;
      const targetData = metadata(targetRef);
      if ( targetData.iteration === iteration ) {
        targetData.dirtiness += increment;
        targetData.targets.forEach(target => {
          if (!handled.has(target)) { // to prevent infinite loops for circularly dependent refs
            handled.add(target);
            handle(target, handled);
          };
        });
      } else {
        targetData.targets.delete(target);
      };
    }
  )(target)
);

export function ref<T>(value: NonFunction<T>): Ref<T, { writable: true }>;
export function ref<T>(getter: () => T): Ref<T, { writable: false }>;
export function ref<T>(getter: () => T, setter: (value: T) => void): Ref<T, { writable: true }>;
export function ref<T>(getterOrValue: T | (() => T), setter?: (value: T) => void) {
  return Ref(isFunction(getterOrValue) ? getterOrValue : () => getterOrValue, setter);
};

export class ComputeeStackMismatchError extends Error {
  constructor(stack: Target[], expected: Target) {
    super(`Computee stack mismatch. Expected ${metadata(expected[0]).id} but got ${stack.map(([ref]) => metadata(ref).id).join(', ')}`);
  };
};

export function Ref<T>(getter: () => T, setter: Undefinable<(value: T) => void>) {

  let cachedValue = NotSet<T>();

  const self = <Ref<T, RefOptions>>((
    value?: Defined<T>,
  ) => {

    const data = metadata(self);
    const { targets } = data;

    if ( value === undefined ) {

      if ( cachedValue === NOT_SET || data.dirtiness ) {

        const target = computeeStack.at(-1);
        target && targets.add(target);

        const selfTarget = [ self, data.iteration++ ] as const;
        computeeStack.push(selfTarget);
        try {
          const newValue = getter();
          if ( newValue === cachedValue ) {
            targets.forEach(clean); // i.e. this value isn't changed, no need to recompute the target at least as far as this source is concerned
            data.alreadyTarnished = false;
          } else {
            cachedValue = newValue;
          };
          data.dirtiness = 0;
        } finally {
          if ( computeeStack.pop() !== selfTarget ) {
            throw new ComputeeStackMismatchError(computeeStack, selfTarget);
          };
        };

      };

      return cachedValue;

    } else {
      if ( setter === undefined ) {
        throw NonWritableRefError();
      };
      setter(value);
      if ( !data.alreadyTarnished ) {
        data.alreadyTarnished = true;
        targets.forEach(tarnish);
      };
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