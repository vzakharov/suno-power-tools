import { maxOf } from "../lodashish";
import { infer, NOT_SET, NotSet, Undefined } from "../types";
import { $throw, $with, Box, beforeReturning, inc, Metabox, nextTick, typeMark, typeMarkTester, WeakM2MMap } from "../utils";

let maxIteration = 0;
const iteration = Metabox((root: RootRef<any>) => maxIteration++);

// Roots

const $RootRef = Symbol('RootRef');
export function RootRef<T>(value: T) {

  const ref = typeMark($RootRef, Box(
    () => {
      computees.forEach(computee => {
        computees_roots(computee).add(ref);
      });
      return value
    },
    setValue => {
      if ( value === setValue ) return;
      [ ref, ...computees_roots(ref) ].forEach(scheduleEffects);
      value = setValue;
      iteration(ref, inc);
    },
  ));

  return ref;
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

  const ref = typeMark($ComputedRef, Box(
    () => {

      if ( 
        cachedValue === NOT_SET
        || $with(maxOf(computees_roots(ref), iteration), maxRootIteration => {
          if ( maxRootIteration > lastMaxRootIteration(ref) ) {
            lastMaxRootIteration(ref, maxRootIteration);
            return true;
          };
        })
      ) {
        computees_roots(ref).clear();
        computees.add(ref);
        try {
          cachedValue = beforeReturning(getter(), newValue =>
            valueChanged(ref, cachedValue !== newValue)
          );
        } finally {
          computees.delete(ref);
        };
      } else {
        // Even if we don't recompute, we must still make sure that the computees' roots are up to date
        computees.forEach(computee => {
          computees_roots(ref).forEach(root => {
            computees_roots(computee).add(root);
          });
        });
      }

      return cachedValue;

    }
  ));

  return ref;
};

export type ComputedRef<T> = ReturnType<typeof ComputedRef<T>>;
export const isComputedRef = typeMarkTester($ComputedRef);

// Effects

type AnyRef = RootRef<any> | ComputedRef<any>;

const refs_effects = WeakM2MMap<AnyRef, Effect>();
const $Effect = Symbol('Effect');

let currentEffect = Undefined<Effect>();
const scheduledEffects = new Set<Effect>();
const valueChanged = Metabox((ref: ComputedRef<any>) => Undefined<boolean>());

export type Effect = ReturnType<typeof Effect>;

export function Effect(callback: () => void) {
  const effect = typeMark($Effect, () => {
    refs_effects(effect).forEach(ref =>
      isComputedRef(ref) && valueChanged(ref, false) // Reset the valueChanged
    );
    currentEffect = effect;
    try {
      callback();
    } finally {
      currentEffect = undefined;
    };
  });
  effect();
  return effect;
};

export const isEffect = typeMarkTester($Effect);

function scheduleEffects(ref: AnyRef) {
  if ( 
    isRootRef(ref) 
    || $with(valueChanged(ref), changed =>
      changed === undefined
        ? (
          ref(), // This will update the valueChanged
          valueChanged(ref) ?? $throw('valueChanged not updated')
        )
        : changed
    )
  ) {
    refs_effects(ref).forEach(effect => {
      if ( !scheduledEffects.size ) {
        nextTick(() => {
          try {
            scheduledEffects.forEach(infer);
          } finally {
            scheduledEffects.clear();
          };
        });
      };
      scheduledEffects.add(effect);
    });
  };
};