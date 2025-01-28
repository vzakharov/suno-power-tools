import { getOrSet, mutated } from "./utils";

const SINGLETON_MAP = new WeakMap<WeakKey, any>();

function createSingleton<T>(
  initializer: () => T, {
    by: keys = [] as WeakKey[]
  } = {}
) {
  let map = SINGLETON_MAP;

  for (const key of keys.slice(0, -1)) {
    map = getOrSet(map, key, () => new WeakMap());
  };
  return getOrSet(map, keys.at(-1) ?? SINGLETON_MAP, initializer) as T;
};

export const Singleton = mutated(
  createSingleton, {
    by: (...keys: WeakKey[]) => <T>(initializer: () => T) => Singleton(initializer, { by: keys })
  }
);

export type Singleton<T> = ReturnType<typeof createSingleton<T>>;