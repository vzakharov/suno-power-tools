import { isFunction, maxOf } from "../lodashish";
import { infer, NonFunction, NOT_SET, NotSet, Undefined } from "../types";
import { $throw, $with, Box, tap, inc, Metabox, nextTick, typeMark, typeMarkTester, TypeMarked, ReadonlyBox, Null, combinedTypeguard, CreateBoxArgs, mutated } from "../utils";
import { WeakBiMap } from "../weaks";

let maxIteration = 0;
const iteration = Metabox((root: RootRef) => maxIteration++);

export type Ref<T = unknown> = RootRef<T> | ComputedRef<T>

// Roots

const $RootRef = Symbol('RootRef');
export type RootRef<T = unknown> = Box<T> & RefMethods<T> & TypeMarked<typeof $RootRef>;

export function RootRef<T>(value: T) {

  const ref = addRefMethods(typeMark($RootRef, Box(
    () => {
      detectEffect(ref);
      detectComputees(ref);
      return value
    },
    setValue => {
      if ( value === setValue ) return;
      valueChanged(ref, true);
      [ ref, ...computees_roots(ref) ].forEach(scheduleEffects);
      value = setValue;
      iteration(ref, inc);
    },
  ))) as RootRef<T>;

  return ref;
};

export const isRootRef = typeMarkTester($RootRef) as (value: any) => value is RootRef;

// Computeds

export type ComputedRef<T = unknown> = ReadonlyComputedRef<T> | WritableComputedRef<T>;

const computees = new Set<ComputedRef>();
const computees_roots = WeakBiMap<RootRef, ComputedRef>();
const lastMaxRootIteration = Metabox((ref: ComputedRef) => 0);
const fixedComputeeSources = Metabox((ref: ComputedRef) => Null<Ref[]>());

const $ReadonlyComputedRef = Symbol('ReadonlyComputedRef');

function detectComputees(ref: RootRef) {
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

export type ReadonlyComputedRef<T = unknown> = ReadonlyBox<T> & RefMethods<T> & TypeMarked<typeof $ReadonlyComputedRef>;
export function ReadonlyComputedRef<T>(getter: () => T, fixedSources?: Ref[]) {

  let cachedValue = NotSet<T>();

  const ref = addRefMethods(typeMark($ReadonlyComputedRef, Box(
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
          cachedValue = tap(getter(), newValue =>
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
  ))) as ReadonlyComputedRef<T>;

  fixedSources && fixedComputeeSources(ref, fixedSources);

  return ref;
};

export const isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef) as (value: any) => value is ReadonlyComputedRef;

// Writable computeds

const $WritableComputedRef = Symbol('WritableComputedRef');
export type WritableComputedRef<T = unknown> = Box<T> & RefMethods<T> & TypeMarked<typeof $WritableComputedRef>;

export function WritableComputedRef<T>(getter: () => T, setter: (value: T) => void, fixedSources?: Ref[]) {

  const ref = addRefMethods(typeMark($WritableComputedRef, Box(
    ReadonlyComputedRef(getter, fixedSources),
    setter
  ))) as WritableComputedRef<T>;

  return ref;
};

export const isWritableComputedRef = typeMarkTester($WritableComputedRef) as (value: any) => value is WritableComputedRef;

export const isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef) as (value: any) => value is ComputedRef;
export const isRef = combinedTypeguard(isRootRef, isComputedRef) as (value: any) => value is Ref;

// Effects

const effects_sources = WeakBiMap<Effect, Ref>();
const $Effect = Symbol('Effect');

let currentEffect = Undefined<Effect>();
const scheduledEffects = new Set<Effect>();
const valueChanged = Metabox((ref: Ref) => Undefined<boolean>());
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

export function Ref<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper: (value: U) => T): WritableComputedRef<U>;
export function Ref<T, U>(source: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
export function Ref<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;
export function Ref<T>(getter: () => T): ReadonlyComputedRef<T>;
export function Ref<T>(value: T): RootRef<T>;
export function Ref<T>(): RootRef<T | undefined>;

export function Ref<T, U>(getterValueOrSource?: T | (() => T) | Ref<T>, setterOrMapper?: (value: T) => U, backMapper?: (value: U) => T) {
  return isRef(getterValueOrSource)
    ? setterOrMapper
      ? backMapper
        ? WritableComputedRef(() => setterOrMapper(getterValueOrSource()), value => getterValueOrSource(backMapper(value)), [getterValueOrSource])
        : ReadonlyComputedRef(() => setterOrMapper(getterValueOrSource()), [getterValueOrSource])
      : $throw('A mapper function must be provided when the first argument is a ref.')
    : isFunction(getterValueOrSource)
      ? setterOrMapper
        ? WritableComputedRef(getterValueOrSource, setterOrMapper)
        : ReadonlyComputedRef(getterValueOrSource)
      : RootRef(getterValueOrSource);
};

export const ref = Ref;

export function toref<T>(source: NonFunction<T> | Ref<T> | (() => T)): Ref<T> {
  return isRef(source) ? source : isFunction(source) ? ReadonlyComputedRef(source) : RootRef(source);
};

export function watch(callback: () => void): Effect;
export function watch<T>(source: Ref<T>, callback: (value: T) => void): Effect;
export function watch<T>(sourceOrCallback: Ref<T> | (() => T), callback?: (value: T) => void) {
  return Effect(callback ? () => callback(toref(sourceOrCallback)()) : sourceOrCallback);
};

export const effect = watch;

// Methods

type RefMethods<T> = {
  
  to<U>(mapper: (value: T) => U): ReadonlyComputedRef<U>;
  to<U>(mapper: (value: T) => U, backMapper: (value: U) => T): WritableComputedRef<U>;

  watch(callback: (value: T) => void): Effect;

};

function RefMethods<T>(r: Ref<T>): RefMethods<T> {

  function to<U>(mapper: (value: T) => U): ReadonlyComputedRef<U>;
  function to<U>(mapper: (value: T) => U, backMapper: (value: U) => T): WritableComputedRef<U>;
  function to<U>(mapper: (value: T) => U, backMapper?: (value: U) => T) {
    return backMapper
      ? Ref(r, mapper, backMapper)
      : Ref(r, mapper);
  };

  return {
    to,
    watch: (callback: (value: T) => void) => watch(r, callback)
  };
};

function addRefMethods<T>(ref: Box<T>) {
  return Object.assign(ref, RefMethods(ref as Ref<T>));
};