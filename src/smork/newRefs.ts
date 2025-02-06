import { maxOf } from "../lodashish";
import { infer, NOT_SET, NotSet, Undefined } from "../types";
import { $throw, $with, Box, beforeReturning, inc, Metabox, nextTick, typeMark, typeMarkTester, WeakBiMap } from "../utils";

let maxIteration = 0;
const iteration = Metabox((root: RootRef<any>) => maxIteration++);

// Roots

const $RootRef = Symbol('RootRef');
export function RootRef<T>(value: T) {

  const ref = typeMark($RootRef, Box(
    () => {
      detectEffect(ref);
      computees.forEach(computee => {
        computees_roots(computee, ref);
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
const computees_roots = WeakBiMap<RootRef<any>, ComputedRef<any>>();
const lastMaxRootIteration = Metabox((ref: ComputedRef<any>) => 0);

const $ComputedRef = Symbol('ComputedRef');
export function ComputedRef<T>(getter: () => T) {

  let cachedValue = NotSet<T>();

  const ref = typeMark($ComputedRef, Box(
    () => {
      detectEffect(ref);
      if ( 
        cachedValue === NOT_SET
        || $with(maxOf(computees_roots(ref), iteration), maxRootIteration => {
          if ( maxRootIteration > lastMaxRootIteration(ref) ) {
            lastMaxRootIteration(ref, maxRootIteration);
            return true;
          };
        })
      ) {
        computees_roots(ref, null);
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
            computees_roots(computee, root);
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

const effects_sources = WeakBiMap<Effect, AnyRef>();
const $Effect = Symbol('Effect');

let currentEffect = Undefined<Effect>();
const scheduledEffects = new Set<Effect>();
const valueChanged = Metabox((ref: ComputedRef<any>) => Undefined<boolean>());

export type Effect = ReturnType<typeof Effect>;

export function Effect(callback: () => void, fixedSources?: AnyRef[]) {

  const effect = typeMark($Effect, () => {
    
    if ( fixedSources ) return callback();

    const sources = [...effects_sources(effect)];
    effects_sources(effect, null);
    sources.forEach(source =>
      isComputedRef(source) && valueChanged(source, false) // Reset the valueChanged
    );
    currentEffect = effect;
    try {
      callback();
    } finally {
      currentEffect = undefined;
    };

  });

  fixedSources
    ? fixedSources.forEach(source => effects_sources(effect, source)) 
    : effect();

  return effect;

};

export const isEffect = typeMarkTester($Effect);

function detectEffect(ref: AnyRef) {
  currentEffect && effects_sources(currentEffect, ref);
};

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
    effects_sources(ref).forEach(effect => {
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