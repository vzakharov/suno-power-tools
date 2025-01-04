export function find<T extends {}, U extends Partial<T>>(arr: T[], filter: U) {
  return arr.find(item => Object.entries(filter).every(([key, value]) => item[key] === value)) as Extract<T, U> | undefined;
}