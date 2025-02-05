import { maxOf } from "../lodashish";
import { NOT_SET, NotSet, Undefined } from "../types";
import { $with, Box, inc, Metabox, nextTick, typeMark, typeMarkTester, WeakM2MMap } from "../utils";

let maxIteration = 0;
const iteration = Metabox((root: RootRef<any>) => maxIteration++);

// Roots

const $RootRef = Symbol('RootRef');
export function RootRef<T>(value: T) {

  const self = typeMark($RootRef, Box(
    () => {
      computees.forEach(computee => {
        computees_roots(computee).add(self);
      });
      return value
    },
    setValue => {
      value = setValue;
      [ self, ...computees_roots(self)].forEach(ref =>
        refs_effects(ref).forEach(scheduleEffect)
      );
      iteration(self, inc);
    },
  ));

  return self;
};

export type RootRef<T> = ReturnType<typeof RootRef<T>>;
export const isRootRef = typeMarkTester($RootRef);

// Computeds

const computees = new Set<ComputedRef<any>>();
const computees_roots = WeakM2MMap<RootRef<any>, ComputedRef<any>>();
const lastMaxRootIteration = Metabox((ref: ComputedRef<any>) => 0);

const $ComputedRef = Symbol('ComputedRef');
export function ComputedRef<T>(getter: () => T) {

  let cachedValue = NotSet<T>();

  const self = typeMark($ComputedRef, Box(
    () => {

      if ( 
        cachedValue === NOT_SET
        || $with(maxOf(computees_roots(self), iteration), maxRootIteration => {
          if ( maxRootIteration > lastMaxRootIteration(self) ) {
            lastMaxRootIteration(self, maxRootIteration);
            return true;
          };
        })
      ) {
        computees_roots(self).clear();
        computees.add(self);
        try {
          cachedValue = getter();
        } finally {
          computees.delete(self);
        };
      } else {
        // Even if we don't recompute, we must still make sure that the computees' roots are up to date
        computees.forEach(computee => {
          computees_roots(self).forEach(root => {
            computees_roots(computee).add(root);
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

// Effects

const refs_effects = WeakM2MMap<RootRef<any> | ComputedRef<any>, Effect>();
const $Effect = Symbol('Effect');

let currentEffect = Undefined<Effect>();
const scheduledEffects = new Set<Effect>();

export type Effect = ReturnType<typeof Effect>;
export function Effect(callback: () => void) {
  const self = typeMark($Effect, () => {
    currentEffect = self;
    try {
      callback();
    } finally {
      currentEffect = undefined;
    };
  });
  return self;
};

function scheduleEffect(effect: Effect) {
  if ( !scheduledEffects.size ) {
    nextTick().then(() => {
      scheduledEffects.forEach(effect => effect());
      scheduledEffects.clear();
    });
  };
  scheduledEffects.add(effect);
};