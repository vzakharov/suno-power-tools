import { $with, getOrSet } from "./utils";

export const BREAK = Symbol('BREAK');

export enum RefStrength {
  WEAK,
  STRONG
}

/**
 * A set-like object that does not prevent garbage collection of its elements. Unlike the usual `WeakSet`, this class is iterable, the iteration going over the then-current elements of the set at the time of the iteration.
 */
export class PhantomSet<T extends object> {
  private set = new Set<WeakRef<T> | T>();

  private *iterator() {
    for (const ref of this.set) {
      if (ref instanceof WeakRef) {
        const value = ref.deref();
        if (value) 
          yield [value, ref] as const;
        else
          this.set.delete(ref);
      } else {
        yield [ref, ref] as const;
      }
    }
  }

  add(value: T, refType = RefStrength.WEAK) {
    this.set.add(
      refType === RefStrength.WEAK
        ? new WeakRef(value)
        : value
    );
    return this;
  };

  has(value: T) {
    for (const [v] of this.iterator()) {
      if (v === value) return true;
    }
    return false;
  };

  clear() {
    this.set.clear();
  };

  delete(value: T) {
    for (const [v, ref] of this.iterator()) {
      if (v === value) {
        this.set.delete(ref);
        return true;
      }
    }
    return false;
  };

  get size() {
    return [...this.iterator()].length;
  }

  get snapshot(): readonly T[] {
    return [...this.iterator()].map(([value]) => value);
  }
}

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
  }

  function updateRelations(node: T | U, relative?: U | T | null, remove?: null) {
    const relatives = getOrSet(relations, node, new PhantomSet());
    if (relative === null) {
      relatives.snapshot.forEach(relative => updateRelations(relative, node, null));
    } else if (relative)
      ([
        [relatives, relative],
        [getOrSet(relations, relative, new PhantomSet()), node]
      ] as const).forEach(([relatives, relative]) => remove === null
        ? relatives.delete(relative)
        : relatives.add(relative)
      );
    return relatives.snapshot;
  }

  return self;

};

export type WeakBiMap = ReturnType<typeof WeakBiMap>;