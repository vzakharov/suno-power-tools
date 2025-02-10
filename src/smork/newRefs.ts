import { isFunction, maxOf } from "../lodashish";
import { Defined, Func, infer, isDefined, NonFunction, NOT_SET, NotSet, Oneple, Undefined } from "../types";
import { $throw, $with, Box, tap, inc, Metabox, nextTick, typeMark, typeMarkTester, TypeMarked, ReadonlyBox, Null, combinedTypeguard, CreateBoxArgs, mutated, $try } from "../utils";
import { PhantomSet, WeakBiMap } from "../weaks";

let maxIteration = 0;
const iteration = Metabox((root: RootRef) => maxIteration++);

export type Ref<T = unknown> = RootRef<T> | ComputedRef<T>
export const allRefs = new PhantomSet<Ref>();

// Roots

const $RootRef = Symbol('RootRef');
export type RootRef<T = unknown> = Box<T> & TypeMarked<typeof $RootRef>;

export function RootRef<T>(value: NonFunction<T>) {

  const ref = typeMark($RootRef, Box(
    () => {
      detectEffect(ref);
      detectComputees(ref);
      return value
    },
    setValue => {
      if ( value === setValue ) return;
      valueChanged(ref, true);
      isDefined(value) && oldValue(ref, value);
      [ ref, ...computees_roots(ref) ].forEach(scheduleEffects);
      value = setValue;
      iteration(ref, inc);
    },
  )) as RootRef<T>;

  allRefs.add(ref);
  return ref;
};

export const isRootRef = typeMarkTester($RootRef) as (value: any) => value is RootRef;

// Computeds

export type ComputedRef<T = unknown> = ReadonlyComputedRef<T> | WritableComputedRef<T>;

const computees = new Set<ComputedRef>();
const computees_roots = WeakBiMap<RootRef, ComputedRef>();
const lastMaxRootIteration = Metabox((ref: ComputedRef) => 0);
const fixedComputeeSource = Metabox((ref: ComputedRef) => Oneple(Null<Ref>()));

const $ReadonlyComputedRef = Symbol('ReadonlyComputedRef');

function detectComputees(ref: RootRef) {
  computees.forEach(computee => {
    const [ source ] = fixedComputeeSource(computee) ?? [];
    if (
      !source 
      || isRootRef(source) ? source === ref : computees.has(source)
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

export function ReadonlyComputedRef<T, U>(getter: () => T, fixedSource?: Ref<U>) {

  let cachedValue = Undefined<T>();

  const ref = typeMark($ReadonlyComputedRef, Box(
    () => {
      detectEffect(ref);
      if ( 
        cachedValue === undefined
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
            valueChanged(
              ref, 
              tap(cachedValue !== newValue, changed =>
                changed && isDefined(cachedValue) && oldValue(ref, cachedValue)
              )
            )
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
  )) as ReadonlyComputedRef<T>;

  fixedSource && fixedComputeeSource(ref, [fixedSource] );
  allRefs.add(ref);

  return ref;
};

export const isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef) as (value: any) => value is ReadonlyComputedRef;

// Writable computeds

const $WritableComputedRef = Symbol('WritableComputedRef');
export type WritableComputedRef<T = unknown> = Box<T> & TypeMarked<typeof $WritableComputedRef>;

export function WritableComputedRef<T, U>(getter: () => T, setter: (value: T) => void, fixedSource?: Ref<U>) {

  const ref = typeMark($WritableComputedRef, Box(
    ReadonlyComputedRef(getter, fixedSource),
    setter
  )) as WritableComputedRef<T>;

  allRefs.add(ref);

  return ref;
};

// Computed overalls

export const isWritableComputedRef = typeMarkTester($WritableComputedRef) as (value: any) => value is WritableComputedRef;

export const isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef) as (value: any) => value is ComputedRef;
export const isRef = combinedTypeguard(isRootRef, isComputedRef) as (value: any) => value is Ref;

export type WritableRef<T = unknown> = WritableComputedRef<T> | RootRef<T>;
export const isWritableRef = combinedTypeguard(isRootRef, isWritableComputedRef) as (value: any) => value is WritableRef;

export function ComputedRef<T>(getter: () => T): ReadonlyComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter?: (value: T) => void): ComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter?: (value: T) => void) {
  return setter
    ? WritableComputedRef(getter, setter)
    : ReadonlyComputedRef(getter);
};

// Effects

export const allEffects = new PhantomSet<Effect>();
const effects_sources = WeakBiMap<Effect, Ref>();
const $Effect = Symbol('Effect');

const scheduledEffects = new Set<Effect>();
const effectCascade: Effect[] = [];
let trackableEffect = Null<Effect>();
const valueChanged = Metabox((ref: Ref) => Null<boolean>());
const oldValue = Metabox((ref: Ref) => Undefined<unknown>());
const pausedEffects = new WeakSet<Effect>();
const destroyedEffects = new WeakSet<Effect>();

enum EffectCommand {
  PAUSE, RESUME, DESTROY = -1
};

export type Effect = TypeMarked<typeof $Effect> & ((command?: EffectCommand) => void);

// export function Effect(callback: () => void): Effect;
// export function Effect<T>(callback: (value: T, oldValue: T | undefined) => void, fixedSource: Ref<T>): Effect;
export function Effect<T>(callback: () => void, fixedSource?: Ref<T>) {

  const effect = typeMark($Effect, (command?: EffectCommand) => {

    if ( effectCascade.includes(effect) ) {
      console.warn('Self-cascading effect detected, skipping to prevent infinite loop.');
      return;
    };

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

    if ( pausedEffects.has(effect) ) {
      return;
    };

    if ( fixedSource ) {
      effects_sources(effect, fixedSource);
    } else {
      effects_sources(effect).forEach(source =>
        valueChanged(source, null) // Reset the valueChanged
      );
      effects_sources(effect, null);
      if ( trackableEffect )
        throw "Effects cannot be nested.";
      trackableEffect = effect;
    };

    try {
      callback();
    } finally {
      trackableEffect = null;
    };

  });

  fixedSource
    ? effects_sources(effect, fixedSource)
    : effect();

  allEffects.add(effect);
  return effect;

};

export const isEffect = typeMarkTester($Effect);

function detectEffect(ref: Ref) {
  trackableEffect && effects_sources(trackableEffect, ref)
};

function scheduleEffects(ref: Ref) {
  if ( 
    isRootRef(ref) 
    || $with(valueChanged(ref), changed =>
      changed === null
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
          const currentEffects = [...scheduledEffects];
          scheduledEffects.clear();
          currentEffects.forEach(effect => effect());
          scheduledEffects.size                       // If new effects were scheduled during the current effects,
            ? effectCascade.push(...currentEffects)   // we need to cascade them to prevent potential infinite loops;
            : effectCascade.splice(0);                // otherwise, we can clear the cascade.
        });
      };
      scheduledEffects.add(effect);
    });
  };
};

// Shorthands

export function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
export function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper: (value: U) => Defined<T>): WritableComputedRef<U>;
export function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper?: (value: U) => Defined<T>): ComputedRef<U>;
export function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper?: (value: U) => Defined<T>) {
  return backMapper
    ? WritableComputedRef(
      () => mapper(source()),
      isWritableRef(source)
        ? value => source(backMapper(value))
        : $throw('Cannot use a backMapper with a readonly ref.'),
      source
    )
    : ReadonlyComputedRef(() => mapper(source()), source)
};

export type DependentRef<T, U> = ReturnType<typeof DependentRef<T, U>>;

export function Ref<T>(value: NonFunction<T>): RootRef<T>;
export function Ref<T>(): RootRef<T | undefined>;
export function Ref<T, U>(source: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
export function Ref<T, U>(source: WritableRef<T>, mapper: (value: T) => U, backMapper: (value: U) => Defined<T>): WritableComputedRef<U>;
export function Ref<T>(getter: () => T): ReadonlyComputedRef<T>;
export function Ref<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;

export function Ref<T, U>(getterValueOrSource?: NonFunction<T> | (() => T) | Ref<T>, setterOrMapper?: (value: T) => U, backMapper?: (value: U) => Defined<T>) {
  return isRef(getterValueOrSource)
    ? DependentRef(
      getterValueOrSource, 
      setterOrMapper ?? $throw('A mapper function must be provided when the first argument is a ref.'),
      backMapper
    )
    : isFunction(getterValueOrSource)
      ? ComputedRef(getterValueOrSource, setterOrMapper)
      : RootRef<T | undefined>(getterValueOrSource)
};

export const ref = Ref;

export function toref<T>(source: NonFunction<T> | Ref<T> | (() => T)): Ref<T> {
  return isRef(source) ? source : isFunction(source) ? ReadonlyComputedRef(source) : RootRef(source);
};

export function watch(callback: () => void): Effect;
export function watch<T>(source: Ref<T>, callback: (value: T, oldValue: T | undefined ) => void): Effect;
export function watch<T>(sourceOrCallback: Ref<T> | (() => T), callback?: (value: T, oldValue: T | undefined ) => void) {
  return isRef(sourceOrCallback)
    ? Effect(
      () => (
        callback ?? $throw('A callback must be provided when the first argument is a ref.')
      )(sourceOrCallback(), oldValue(sourceOrCallback)),
      sourceOrCallback
    )
    : Effect(sourceOrCallback);
};

export const effect = watch;

export function map<T, U>(ref: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
export function map<T, U>(ref: WritableRef<T>, mapper: (value: T) => U, backMapper: (value: U) => Defined<T>): WritableComputedRef<U>;
export function map<T, U>(ref: Ref<T>, mapper: (value: T) => U, backMapper?: (value: U) => Defined<T>) {
  return backMapper
    ? isWritableRef(ref)
      ? Ref(ref, mapper, backMapper)
      : $throw('Cannot use a backMapper with a readonly ref.')
    : Ref(ref, mapper);
};