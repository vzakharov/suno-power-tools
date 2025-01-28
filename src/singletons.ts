import { Func, Inferable } from "./types";
import { addAccessor, getOrSet } from "./utils";

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

type PlainSingletonFactory = typeof createSingleton;

const SINGLETON_CHAINED_FACTORIES = {
  by: (...keys: WeakKey[]) => <T>(initializer: () => T) => Singleton(initializer, { by: keys })
};

type SingletonChainFactories = typeof SINGLETON_CHAINED_FACTORIES;

export type SingletonFactory = PlainSingletonFactory & SingletonChainFactories;

export const Singleton = Object.assign(
  createSingleton, SINGLETON_CHAINED_FACTORIES
) as SingletonFactory;

export type Singleton<T> = ReturnType<typeof createSingleton<T>>;