export function find<T extends {}, U extends Partial<T>>(arr: T[], filter: U) {
  return arr.find(createPredicate(filter));
}

export function filter<T extends {}, U extends Partial<T>>(arr: T[], filter: U) {
  return arr.filter(createPredicate(filter));
};

export function createPredicate<T extends {}, U extends Partial<T>>(filter: U) {
  return function(item: T): item is T & U {
    return Object.entries(filter).every(([key, value]) => item[key] === value);
  }
};

let lastId = 0;

export function uniqueId(prefix = '') {
  return `${prefix}${++lastId}`;
};

export function mapValues<
  T extends object,
  V
>(obj: T, mapper: (value: T[keyof T], key: keyof T) => V) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, mapper(value, key as keyof T)])
  ) as {
    [K in keyof T]: V;
  };
};