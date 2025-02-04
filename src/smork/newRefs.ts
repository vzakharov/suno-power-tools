import { maxOf } from "../lodashish";
import { NOT_SET, NotSet } from "../types";
import { Box, inc, Metabox, WeakM2MMap } from "../utils";


const lastMaxRootIteration = Metabox((ref: ComputedRef<any>) => 0);
const sourceRoots = Metabox((ref: ComputedRef<any>) => new Set<RootRef<any>>())
let maxIteration = 0;
const iteration = Metabox((root: RootRef<any>) => maxIteration++);
const computees = new Set<ComputedRef<any>>();

export function RootRef<T>(value: T) {

  const self = Box(
    () => {
      computees.forEach(computee => {
        sourceRoots(computee).add(self);
      });
      return value
    },
    setValue => {
      value = setValue;
      iteration(self, inc);
    },
  );

  return self;
};

export type RootRef<T> = ReturnType<typeof RootRef<T>>;

export function ComputedRef<T>(getter: () => T) {

  let cachedValue = NotSet<T>();

  const self = Box(
    () => {
      if ( 
        cachedValue === NOT_SET
      ) {
        return recompute()
      } else {
        const maxRootIteration = maxOf(sourceRoots(self), iteration);
        if ( maxRootIteration > lastMaxRootIteration(self) ) {
          lastMaxRootIteration(self, maxRootIteration);
          return recompute();
        };
        return cachedValue;
      };

      function recompute() {
        sourceRoots(self).clear();
        computees.add(self);
        try {
          return cachedValue = getter();
        } finally {
          computees.delete(self);
        };
      };
    }
  );

  return self;
};

export type ComputedRef<T> = ReturnType<typeof ComputedRef<T>>;