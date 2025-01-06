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