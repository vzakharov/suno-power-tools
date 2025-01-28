import { div } from "./smork/dom";
import { Func } from "./types";
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

export function SingletonFactory<
  TParams extends object[],
  TInstance
>(Factory: Func<TParams, TInstance>) {
  return (...args: TParams) => Singleton.by(...args)(() => Factory(...args))
};
export type SingletonFactory<TParams extends object[], TInstance> = ReturnType<typeof SingletonFactory<TParams, TInstance>>;

// e.g.
type Product = { name: string; price: number };
type User = { name: string };
const ProductCard = SingletonFactory(
  (product: Product, user: User) => div(
    { class: 'product-card' }, [
      div({ class: 'product-card__name' }, [ product.name ]),
      div({ class: 'product-card__price' }, [ String(product.price) ]),
      div({ class: 'product-card__user' }, [ user.name ]),
    ]
  )
)
// I.e., if ProductCard is called with the same product and user, it will return the same element instead of creating a new one
// (This won't exactly work because it won't be reactive, but this is just an illustration of the concept)