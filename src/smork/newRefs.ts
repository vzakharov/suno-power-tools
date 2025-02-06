import { isFunction, maxOf } from "../lodashish";
import { infer, NonFunction, NOT_SET, NotSet, Undefined } from "../types";
import { $throw, $with, Box, beforeReturning, inc, Metabox, nextTick, typeMark, typeMarkTester, WeakBiMap, TypeMarked, ReadonlyBox, Null, combinedTypeguard, CreateBoxArgs } from "../utils";

let maxIteration = 0;
const iteration = Metabox((root: RootRef) => maxIteration++);

export type Ref<T = unknown> = RootRef<T> | ComputedRef<T>

// Roots

const $RootRef = Symbol('RootRef');
export type RootRef<T = unknown> = Box<T> & TypeMarked<typeof $RootRef>;

export function RootRef<T>(value: T) {

  const ref: RootRef<T> = typeMark($RootRef, Box(
    () => {
      detectEffect(ref);
      detectComputees(ref);
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

export const isRootRef = typeMarkTester($RootRef);

// Computeds

export type ComputedRef<T = unknown> = ReadonlyComputedRef<T> | WritableComputedRef<T>;

const computees = new Set<ComputedRef>();
const computees_roots = WeakBiMap<RootRef, ComputedRef>();
const lastMaxRootIteration = Metabox((ref: ComputedRef) => 0);
const fixedComputeeSources = Metabox((ref: ComputedRef) => Null<Ref[]>());

const $ReadonlyComputedRef = Symbol('ReadonlyComputedRef');

function detectComputees(ref: Box & TypeMarked<typeof $RootRef>) {
  computees.forEach(computee => {
    const fixedSources = fixedComputeeSources(computee);
    if (
      !fixedSources 
      || fixedSources.some(source => isRootRef(source) ? source === ref : computees.has(source))
      /* 
      In other words, we are checking if any of the fixed sources:
      - are the current root ref, or
      - are among the computees that are currently being computed, i.e. that depend on the current root ref
      */
    ) {
      computees_roots(computee, ref);
    };
  });
};

export type ReadonlyComputedRef<T = unknown> = ReadonlyBox<T> & TypeMarked<typeof $ReadonlyComputedRef>;
export function ReadonlyComputedRef<T>(getter: () => T, fixedSources?: Ref[]) {

  let cachedValue = NotSet<T>();

  const ref: ReadonlyComputedRef<T> = typeMark($ReadonlyComputedRef, Box(
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

  fixedSources && fixedComputeeSources(ref, fixedSources);

  return ref;
};

export const isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef);

// Writable computeds

const $WritableComputedRef = Symbol('WritableComputedRef');
export type WritableComputedRef<T> = Box<T> & TypeMarked<typeof $WritableComputedRef>;

export function WritableComputedRef<T>(getter: () => T, setter: (value: T) => void, fixedSources?: Ref[]) {

  const ref: WritableComputedRef<T> = typeMark($WritableComputedRef, Box(
    ReadonlyComputedRef(getter, fixedSources),
    setter
  ));

  return ref;
};

export const isWritableComputedRef = typeMarkTester($WritableComputedRef);

export const isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef);
export const isRef = combinedTypeguard(isRootRef, isComputedRef);

// Effects

const effects_sources = WeakBiMap<Effect, Ref>();
const $Effect = Symbol('Effect');

let currentEffect = Undefined<Effect>();
const scheduledEffects = new Set<Effect>();
const valueChanged = Metabox((ref: ComputedRef<any>) => Undefined<boolean>());
const pausedEffects = new WeakSet<Effect>();
const destroyedEffects = new WeakSet<Effect>();

enum EffectCommand {
  PAUSE, RESUME, DESTROY
};

export type Effect = ReturnType<typeof Effect>;

export function Effect(callback: () => void, fixedSources?: Ref[]) {

  const effect = typeMark($Effect, (command?: EffectCommand) => {

    if ( destroyedEffects.has(effect) )
      throw "This effect has been destroyed and cannot be used anymore.";

    if ( command === EffectCommand.PAUSE ) {
      pausedEffects.add(effect);
      return;
    } else if ( command === EffectCommand.RESUME ) {
      pausedEffects.delete(effect);
    } else if ( command === EffectCommand.DESTROY ) {
      effects_sources(effect, null);
      destroyedEffects.add(effect);
      return;
    };

    if ( fixedSources ) return callback();

    const sources = [...effects_sources(effect)];
    effects_sources(effect, null);
    sources.forEach(source =>
      isReadonlyComputedRef(source) && valueChanged(source, false) // Reset the valueChanged
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

function detectEffect(ref: Ref) {
  currentEffect && effects_sources(currentEffect, ref);
};

function scheduleEffects(ref: Ref) {
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
      if ( pausedEffects.has(effect) ) return;
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

// Shorthands

export function ref<T>(): RootRef<T | undefined>;
export function ref<T>(value: NonFunction<T>): RootRef<T>;
export function ref<T>(getter: () => T): ReadonlyComputedRef<T>;
export function ref<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;
export function ref<T, U>(source: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
export function ref<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper: (value: U) => T): WritableComputedRef<U>;

export function ref<T, U>(first?: T | (() => T) | Ref<T>, second?: (value: T) => U, third?: (value: U) => T) {
  return isRef(first)
    ? second
      ? third
        ? WritableComputedRef(() => second(first()), value => first(third(value)), [first])
        : ReadonlyComputedRef(() => second(first()), [first])
      : $throw('A mapper function must be provided when the first argument is a ref.')
    : isFunction(first)
      ? second
        ? WritableComputedRef(first, second)
        : ReadonlyComputedRef(first)
      : RootRef(first);
};

export function toref<T>(source: NonFunction<T> | Ref<T> | (() => T)): Ref<T> {
  return isRef(source) ? source : isFunction(source) ? ReadonlyComputedRef(source) : RootRef(source);
};

export function effect(callback: () => void) {
  return Effect(callback);
};

export function watch<T>(source: Ref<T> | (() => T), callback: (value: T) => void) {
  return Effect(() => callback(toref(source)()));
};