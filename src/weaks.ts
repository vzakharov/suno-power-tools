import { getOrSet } from "./utils";

export const BREAK = Symbol('BREAK');

export class PhantomSet<T extends object> {
  private set = new Set<WeakRef<T>>();

  private *iterator() {
    for (const ref of this.set) {
      const value = ref.deref();
      if (value) yield [value, ref] as const;
      else this.set.delete(ref);
    }
  }

  add(value: T): this {
    this.set.add(new WeakRef(value));
    return this;
  }

  has(value: T): boolean {
    for (const v of this) {
      if (v === value) return true;
    }
    return false;
  }

  clear(): void {
    this.set.clear();
  }

  delete(value: T): boolean {
    for (const [v, ref] of this.iterator()) {
      if (v === value) {
        this.set.delete(ref);
        return true;
      }
    }
    return false;
  }

  get size(): number {
    return [...this].length;
  }

  forEach(callbackfn: (value: T) => unknown): void {
    for (const value of this) {
      if (callbackfn(value) === BREAK) break;
    }
  }

  map<U>(callback: (value: T) => U): U[] {
    return [...this].map(callback);
  }

  [Symbol.iterator](): Iterator<T> {
    return (function* (this: PhantomSet<T>) {
      for (const [value] of this.iterator()) {
        yield value;
      }
    }).call(this);
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
  };

  function updateRelations(node: T | U, relative?: U | T | null, remove?: null) {
    const relatives = getOrSet(relations, node, new PhantomSet());
    if (relative === null) {
      relatives.forEach(relative => updateRelations(relative, node, null));
    } else if (relative)
      ([
        [relatives, relative],
        [getOrSet(relations, relative, new PhantomSet()), node]
      ] as const).forEach(([relatives, relative]) => remove === null
        ? relatives.delete(relative)
        : relatives.add(relative)
      );
    return [...relatives] as const;
  };

  return self;

};

export type WeakBiMap = ReturnType<typeof WeakBiMap>;