import { maxOf } from "../lodashish";
import { NOT_SET, NotSet } from "../types";
import { $with, Box, inc, Metabox, typeMark, typeMarkTester, WeakM2MMap } from "../utils";


const lastMaxRootIteration = Metabox((ref: ComputedRef<any>) => 0);
const computeeRoots = WeakM2MMap<RootRef<any>, ComputedRef<any>>();
let maxIteration = 0;
const iteration = Metabox((root: RootRef<any>) => maxIteration++);
const computees = new Set<ComputedRef<any>>();

export const $RootRef = Symbol('RootRef');
export function RootRef<T>(value: T) {

  const self = typeMark($RootRef, Box(
    () => {
      computees.forEach(computee => {
        computeeRoots(computee).add(self);
      });
      return value
    },
    setValue => {
      value = setValue;
      iteration(self, inc);
    },
  ));

  return self;
};

export type RootRef<T> = ReturnType<typeof RootRef<T>>;
export const isRootRef = typeMarkTester($RootRef);

export const $ComputedRef = Symbol('ComputedRef');
export function ComputedRef<T>(getter: () => T) {

  let cachedValue = NotSet<T>();

  const self = typeMark($ComputedRef, Box(
    () => {

      if ( 
        cachedValue === NOT_SET
        || $with(maxOf(computeeRoots(self), iteration), maxRootIteration => {
          if ( maxRootIteration > lastMaxRootIteration(self) ) {
            lastMaxRootIteration(self, maxRootIteration);
            return true;
          };
        })
      ) {
        computeeRoots(self).clear();
        computees.add(self);
        try {
          cachedValue = getter();
        } finally {
          computees.delete(self);
        };
      } else {
        // Even if we don't recompute, we must still make sure that the computees' roots are up to date
        computees.forEach(computee => {
          computeeRoots(self).forEach(root => {
            computeeRoots(computee).add(root);
          });
        });
      }

      return cachedValue;

    }
  ));

  return self;
};

export type ComputedRef<T> = ReturnType<typeof ComputedRef<T>>;
export const isComputedRef = typeMarkTester($ComputedRef);