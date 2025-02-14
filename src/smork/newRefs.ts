import { WeakGraph } from "../graph";
import { filter, forEach, forEachValue, isFunction, isObject, maxOf } from "../lodashish";
import { Singleton } from "../singletons";
import { Defined, Func, IfReadonly, infer, isDefined, isKeyOf, isReadonlyKey, KeyWithValueNotOfType, NonFunction, Oneple, Typeguard, Undefined } from "../types";
import { $throw, $with, Box, combinedTypeguard, EmptyArray, inc, Metabox, nextTick, Null, ReadonlyBox, tap, TypeMarked, typeMarkTester } from "../utils";
import { PhantomSet } from "../weaks";

let maxIteration = 0;
const iteration = Metabox(() => maxIteration++);

export type Ref<T = unknown> = RootRef<T> | ComputedRef<T>
export const allRefs = new PhantomSet<Ref>();

// #region DeepRefs

type SubRefKey<T> = Extract<KeyWithValueNotOfType<Func, T>, string>;

type ReadonlyDeepRef<T = unknown> = ReadonlyBox<T> & TypeMarked<$ReadonlyComputedRef> & {
  readonly [K in SubRefKey<T>]: ReadonlyDeepRef<T[K]>
};

type WritableDeepRef<TMark extends $WritableRef, T = unknown> = Box<T> & TypeMarked<TMark> & {
  readonly [K in SubRefKey<T>]:
    IfReadonly<K, T,
      ReadonlyDeepRef<T[K]>,
      WritableDeepRef<$WritableComputedRef, T[K]>
    >
};

enum AccessMode {
  READONLY, WRITABLE
}

function ReadonlyDeepRef<T>(getter: () => T) {
  return new Proxy(TypeMarked($ReadonlyComputedRef, Box(getter)), {
    get: deepGetter(AccessMode.READONLY)<T>,
    set: () => { throw "Cannot set a value on a readonly ref."; }
  }) as ReadonlyDeepRef<T>;
};

function deepGetter<TAccessMode extends AccessMode>(accessMode: TAccessMode) {

  return function getDeep<T>(target: TAccessMode extends AccessMode.READONLY ? ReadonlyBox<T> : Box<T>, prop: string | symbol, proxy: object) {

    const targetValue = target();
    if ( !isObject(targetValue) || !isKeyOf(targetValue, prop) ) return targetValue[prop];
    const value = targetValue[prop];
    const getSubRef = () => accessMode === AccessMode.READONLY || isReadonlyKey(prop, targetValue)
      ? ReadonlyDeepRef(() => value)
      : WritableDeepRef($WritableComputedRef, () => value, value => target({ ...targetValue, [prop]: value } as Defined<T> ));
    return (
      isFunction(value)
        ? value
      : isObject(value)
        ? Singleton.by(proxy, target, value)(getSubRef)
      : getSubRef()
    );
  };

}

function WritableDeepRef<TMark extends $WritableRef, T>(typeMark: TMark, getter: () => T, setter: (value: T) => void) {
  return new Proxy(Box(getter, setter), {
    get: deepGetter(AccessMode.WRITABLE)<T>,
    set: () => {
      throw "Cannot set values by assigning to a ref directly. Use the setter function instead.";
    }
  }) as WritableDeepRef<TMark, T>;
};

// #endregion

// #region Roots

const $RootRef = Symbol('RootRef');
type $RootRef = typeof $RootRef;
export type RootRef<T = unknown> = WritableDeepRef<$RootRef, T>;

export function RootRef<T>(value: NonFunction<T>) {

  const ref = WritableDeepRef($RootRef,
    () => {
      trackComputee(ref);
      return value
    },
    setValue => {
      if ( value === setValue ) return;
      valueChanged(ref, true);
      isDefined(value) && oldValue(ref, value);
      [ ref, ...computees(ref) ].forEach(scheduleEffects);
      value = setValue;
      iteration(ref, inc);
    },
  ) as RootRef<T>;

  allRefs.add(ref);
  return ref;
};

export const isRootRef = typeMarkTester($RootRef) as Typeguard<RootRef>;

// #endregion

// #region Computeds

export type ComputedRef<T = unknown> = ReadonlyComputedRef<T> | WritableComputedRef<T>;

// let currentComputee = Null<ComputedRef>();
const computeeStack: ComputedRef[] = [];
const [ sources, computees, linkComputee ] = WeakGraph<Ref, ComputedRef>();
const maxSourceIteration = Metabox((ref: ComputedRef) => 0);
// const fixedComputeeSources = Metabox((ref: ComputedRef) => EmptyArray<Ref>());
const staticComputees = new WeakSet<ComputedRef>();

const $ReadonlyComputedRef = Symbol('ReadonlyComputedRef');
type $ReadonlyComputedRef = typeof $ReadonlyComputedRef;

function trackComputee(ref: Ref) {
  const currentComputee = computeeStack.at(-1);
  if ( !currentComputee ) return;
  if ( 
    !staticComputees.has(currentComputee) 
    || sources(currentComputee).includes(ref)
    // i.e. if the computee is dynamic or the current ref is among its fixed sources
  ) {
    linkComputee(ref, currentComputee);
  };
  isRootRef(ref)
    && forEach(computeeStack, computee => 
      isEffect(computee) && setEffect(ref, computee)
    );
};

export type ReadonlyComputedRef<T = unknown> = ReadonlyDeepRef<T>;

export function ReadonlyComputedRef<T, U>(getter: () => T, staticSource?: Ref<U>) {

  let cachedValue = Undefined<T>();

  const self = ReadonlyDeepRef(
    () => {
      trackComputee(self);
      if ( 
        cachedValue === undefined
        || $with(maxOf(sources(self), iteration), sourceIteration => {
          if ( sourceIteration > maxSourceIteration(self) ) {
            maxSourceIteration(self, sourceIteration);
            return true;
          };
        })
      ) {
        !staticSource && sources(self, []); // we don't want to clear a static source
        if ( computeeStack.includes(self) ) {
          console.warn('Circular dependency detected: stack', computeeStack, 'includes', self, 'returning cached value:', cachedValue);
          return cachedValue;
        };
        computeeStack.push(self);
        try {
          cachedValue = tap(getter(), newValue =>
            valueChanged(
              self, 
              tap(cachedValue !== newValue, changed =>
                changed && isDefined(cachedValue) && oldValue(self, cachedValue)
              )
            )
          );
        } finally {
          const popped = computeeStack.pop();
          if ( popped !== self ) {
            console.warn('Mismatched computee stack, expected', self, 'but got', popped, 'trying to fix...');
            const index = computeeStack.indexOf(self);
            if ( index === -1 ) {
              throw 'Could not find the expected computee in the stack, aborting.';
            }
            computeeStack.splice(index);
            console.warn('Fixed computee stack:', computeeStack);
          };
        };
      };

      return cachedValue;

    }
  ) as ReadonlyComputedRef<T>;

  staticSource && sources(self, [ staticSource ]) && staticComputees.add(self);
  allRefs.add(self);

  return self;
};

export const isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef) as Typeguard<ReadonlyComputedRef>;

// #endregion

// #region Writable computeds

const $WritableComputedRef = Symbol('WritableComputedRef');
type $WritableComputedRef = typeof $WritableComputedRef;
type $WritableRef = $RootRef | $WritableComputedRef;
export type WritableComputedRef<T = unknown> = WritableDeepRef<$WritableComputedRef, T>;

export function WritableComputedRef<T, U>(getter: () => T, setter: (value: T) => void, fixedSource?: Ref<U>) {

  const ref = WritableDeepRef($WritableComputedRef,
    ReadonlyComputedRef(getter, fixedSource),
    setter
  ) as WritableComputedRef<T>;

  allRefs.add(ref);

  return ref;
};

// #endregion

// #region Combined computed helpers etc.

export const isWritableComputedRef = typeMarkTester($WritableComputedRef) as Typeguard<WritableComputedRef>;

export const isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef) as Typeguard<ComputedRef>;
export const isRef = combinedTypeguard(isRootRef, isComputedRef) as Typeguard<Ref>;

export type WritableRef<T = unknown> = WritableComputedRef<T> | RootRef<T>;
export const isWritableRef = combinedTypeguard(isRootRef, isWritableComputedRef) as Typeguard<WritableRef>;

export function ComputedRef<T>(getter: () => T): ReadonlyComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter: (value: T) => void): WritableComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter?: (value: T) => void): ComputedRef<T>;
export function ComputedRef<T>(getter: () => T, setter?: (value: T) => void) {
  return setter
    ? WritableComputedRef(getter, setter)
    : ReadonlyComputedRef(getter);
};

// #endregion

// #region Effects

export const allEffects = new PhantomSet<Effect>();
const $Effect = Symbol('Effect');

const scheduledEffects = new Set<Effect>();
const cascadingEffects: Effect[] = [];
const valueChanged = Metabox(() => Null<boolean>());
const oldValue = Metabox(() => Undefined<unknown>());
const [ rootEffects, effectRoots, setEffect ] = WeakGraph<RootRef, Effect>();

enum EffectState {
  PAUSED, ACTIVE, DESTROYED = -1
};

export type Effect<T = unknown> = TypeMarked<typeof $Effect> & ReadonlyComputedRef<T | undefined>;

const effectState = Metabox(() => EffectState.ACTIVE);

export function Effect<T>(callback: () => T, fixedSource?: Ref): Effect<T | undefined> {

  const effect = TypeMarked($Effect, ReadonlyComputedRef(callback, fixedSource));

  allEffects.add(effect);
  return effect;
};

export const isEffect = typeMarkTester($Effect) as Typeguard<Effect>;

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
    filter(computees(ref), isEffect).forEach(effect => {

      switch (effectState(effect)) {
        case EffectState.DESTROYED:
          sources(effect, []);
        case EffectState.PAUSED:
          return;
      };

      if (cascadingEffects.includes(effect)) {
        console.warn('Self-cascading effect detected, skipping to prevent infinite loop:', effect);
        return;
      };
  
      if ( !scheduledEffects.size ) {
        nextTick(() => {
          const currentEffects = [...scheduledEffects];
          scheduledEffects.clear();
          currentEffects.forEach(infer);
          scheduledEffects.size                       // If new effects were scheduled during the current effects,
            ? cascadingEffects.push(...currentEffects)   // we need to cascade them to prevent potential infinite loops;
            : cascadingEffects.splice(0);                // otherwise, we can clear the cascade.
        });
      };

      scheduledEffects.add(effect);
    });
  };
};

// #endregion

// #region Shorthands

function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U): ReadonlyComputedRef<U>;
function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper: (value: U) => Defined<T>): WritableComputedRef<U>;
function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper?: (value: U) => Defined<T>): ComputedRef<U>;
function DependentRef<T, U>(source: Ref<T>, mapper: (value: T) => U, backMapper?: (value: U) => Defined<T>) {
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

type DependentRef<T, U> = ReturnType<typeof DependentRef<T, U>>;

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

export function watch<E>(callback: () => E): Effect<E>;
export function watch<T, E>(source: Ref<T>, callback: (value: T, oldValue: T | undefined ) => E): Effect<E>;
export function watch<T, E>(sourceOrCallback: Ref<T> | (() => T), callback?: (value: T, oldValue: T | undefined ) => E) {
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

// #endregion

// #region Examples

const context = ref({ user: { name: 'John', age: 30 } });
context() // { user: { name: 'John', age: 30 } }
context.user() // { name: 'John', age: 30 }
context.user.name() // 'John'
context.user.name('Jane') // 'Jane'
context() // { user: { name: 'Jane', age: 30 } }
// Effect that has a value
const api = { updateUser: () => Promise.resolve(true) };
 // This effect returns a promise that we can use to track the status of the update