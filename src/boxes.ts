import { isFunction } from "./lodashish";
import { TypeMarked, typeMarkTester } from "./typemarks";
import { Undefinable, Defined, NonFunction, isDefined } from "./types";
import { Metadata, OnlyOne, onlyOne } from "./utils";

export type CreateBoxArgs<T, TWritable extends boolean> = [
  getterOrValue: T | ((oldValue: Undefinable<T>) => T),
  setter?: TWritable extends true ? (value: Defined<T>, oldValue: Undefinable<T>) => void : never
];

export type ValueSetter<T> = Defined<T> | ((value: T, oldValue: Undefinable<T>) => Defined<T>);

export const $Readonly = Symbol('Readonly');

export const $Box = Symbol('Box');
export type $Box = TypeMarked<typeof $Box>;
export const isBox = typeMarkTester<Box>($Box);

export function createBox<T, TWritable extends boolean>(...[ getterOrValue, setter ]: CreateBoxArgs<T, TWritable>) {

  let oldValue = isFunction(getterOrValue) ? undefined as T : getterOrValue;

  function getCurrentValue() {
    return isFunction(getterOrValue) ? getterOrValue(oldValue) : oldValue;
  };

  return TypeMarked($Box, function box(setValue?: ValueSetter<T>) {
      if ( setValue === undefined ) {
        return oldValue = getCurrentValue();
      } else {
        if ( !setter ) {
          throw new TypeError('Cannot set value on a read-only box');
        };
        if ( isFunction(setValue) ) {
          return box(setValue(getCurrentValue(), oldValue));
        } else {
          setter(setValue, oldValue);
          return oldValue = setValue;
        };
      };
    }
  );
    
};

export function Box<T>(getter: () => T): ReadonlyBox<T>;
export function Box<T>(value: T): Box<T>;
export function Box<T>(...args: CreateBoxArgs<T, true>): Box<T>;

export function Box<T>(...args: CreateBoxArgs<T, boolean>) {
  return createBox(...args);
};

export type ParametricBox<T, TWritable extends boolean> =
  TWritable extends true 
    ? Box<T> 
    : ReadonlyBox<T>;

export type ReadonlyBox<T = unknown> = $Box & (() => T);

export type Box<T = unknown> = $Box & {
  (): T,
  (setValue: ValueSetter<T>): T,
};

export const $Metabox = Symbol('Metabox');
export type $Metabox = TypeMarked<typeof $Metabox>;
export const isMetabox = typeMarkTester<Metabox>($Metabox);

type SetterArgs<TSubjects extends WeakKey[], TValue> = [
  ...subjects: TSubjects,
  value: Defined<NonFunction<TValue>>
];

export function createMetabox<
  TSubjects extends WeakKey[],
  TValue,
  TWritable extends boolean,
>(
  initializer: (subjects: TSubjects) => CreateBoxArgs<NonFunction<TValue>, TWritable>
) {

  const metadata = Metadata<TSubjects, ParametricBox<NonFunction<TValue>, TWritable>>(subjects => {
    const [ getter, setter ] = initializer(subjects);
    return createBox(getter, setter);
  });
  
  function metabox<T extends TValue>(subjects: TSubjects): T;
  function metabox<T extends TValue>(subject: OnlyOne<TSubjects>): T;
  function metabox<T extends TValue>(subjects: TSubjects, setValue: ValueSetter<NonFunction<T>>): T;
  function metabox<T extends TValue>(subject: OnlyOne<TSubjects>, setValue: ValueSetter<NonFunction<T>>): T;
  function metabox(target: TSubjects | OnlyOne<TSubjects>, setValue?: ValueSetter<NonFunction<TValue>>) {
    const subjects = Array.isArray(target)
        ? target
        : onlyOne(target);
    return isDefined(setValue) ? metadata(subjects)(setValue) : metadata(subjects)();
  };

  return TypeMarked($Metabox, metabox);

};

export type ReadonlyMetabox<TSubjects extends WeakKey[], TValue> = $Metabox & {
  <T extends TValue>(subjects: TSubjects): T;
  <T extends TValue>(subject: OnlyOne<TSubjects>): T;
};

export type Metabox<TSubjects extends WeakKey[] = object[], TValue = unknown> = ReadonlyMetabox<TSubjects, TValue> & {
  <T extends TValue>(subjects: TSubjects, setValue: ValueSetter<T>): T;
  <T extends TValue>(subject: OnlyOne<TSubjects>, setValue: ValueSetter<T>): T;
};

export function Metabox<TSubjects extends WeakKey[], TValue>(
  initializer: (...subjects: TSubjects) => Defined<NonFunction<TValue>>
): Metabox<TSubjects, TValue>;
export function Metabox<TSubjects extends WeakKey[], TValue>(
  getter: Undefinable<(...subjects: TSubjects) => Defined<NonFunction<TValue>>>,
  setter: (...args: SetterArgs<TSubjects, TValue>) => void
): Metabox<TSubjects, TValue>;

export function Metabox<TSubjects extends WeakKey[], TValue>(
  getterOrInitializer: Undefinable<(...subjects: TSubjects) => Defined<NonFunction<TValue>>>,
  setter?: (...args: SetterArgs<TSubjects, TValue>) => void
) {
  return createMetabox<TSubjects, TValue, true>(
    subjects => [
      getterOrInitializer?.(...subjects) ?? undefined as NonFunction<TValue>,
      setter && ( value => setter(...subjects, value) )
    ]
  );
};

export function readonly<T>(box: Box<NonFunction<T>>): ReadonlyBox<T>;
export function readonly<TSubjects extends WeakKey[], TValue>(metabox: Metabox<TSubjects, NonFunction<TValue>>): ReadonlyMetabox<TSubjects, TValue>;
export function readonly<T>(target: Box<NonFunction<T>> | Metabox<any, NonFunction<T>>) {
  return isMetabox(target)
    ? createMetabox((subject: any) => [ target(subject), undefined ])
    : createBox(() => target());
};