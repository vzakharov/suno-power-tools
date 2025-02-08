import { getOrSet } from "./utils";

export type PhantomSet<T> = { 
  add(value: T): PhantomSet<T>, 
  has(value: T): boolean, 
  clear(): void, 
  delete(value: T): boolean, 
  readonly size: number, 
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void, 
  [Symbol.iterator](): SetIterator<T> 
};

/**
 * Creates a set-like object whose values can be garbage collected if they are not strongly referenced elsewhere. Unlike a regular `WeakSet`, this set is iterable.
 */
export function PhantomSet<T extends object>(): PhantomSet<T> {

  const set = new Set<WeakRef<T>>();

  const removeStales = () => (
    set.forEach(ref => !ref.deref() && set.delete(ref)),
    set
  );

  const snapshot = () => new Set([...removeStales()].map(ref => ref.deref()).filter(Boolean) as T[]);

  const self = {

    add(value: T) {
      set.add(new WeakRef(value));
      return self;
    },

    has(value: T) {
      return snapshot().has(value);
    },

    clear() {
      set.clear();
    },

    delete(value: T) {
      removeStales();
      for (const ref of set) {
        if (ref.deref() === value) {
          set.delete(ref);
          return true;
        };
      };
      return false;
    },

    get size() {
      return snapshot().size;
    },

    forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void) {
      snapshot().forEach(callbackfn);
    },

    [Symbol.iterator]() {
      return snapshot()[Symbol.iterator]();
    },

  };

  return self;

};

export function WeakBiMap<T extends object, U extends object>() {

  const relations = new WeakMap<T | U, PhantomSet<T> | PhantomSet<U>>();

  function self(node: T): readonly U[];
  function self(node: U): readonly T[];
  function self(node: T, removeNode: null): void;
  function self(node: U, removeNode: null): void;
  function self(node: T, addOrRemoveRelative: U, remove?: null): readonly U[];
  function self(node: U, addOrRemoveRelative: T, remove?: null): readonly T[];
  function self(...args: Parameters<typeof updateRelations>) {
    return updateRelations(...args);
  };

  function updateRelations(node: T | U, relative?: U | T | null, remove?: null) {
    const relatives = getOrSet(relations, node, PhantomSet());
    if (relative === null) {
      relatives.forEach(relative => updateRelations(relative, node, null)
      );
    } else if (relative)
      ([
        [relatives, relative],
        [getOrSet(relations, relative, PhantomSet()), node]
      ] as const).forEach(([relatives, relative]) => remove === null
        ? relatives.delete(relative)
        : relatives.add(relative)
      );
    return [...relatives] as const;
  };

  return self;

};

export type WeakBiMap = ReturnType<typeof WeakBiMap>;