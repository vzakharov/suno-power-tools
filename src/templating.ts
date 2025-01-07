import { StringKey, UnionToIntersection } from "./types";

export type MonoTemplate<T extends string> = `${string}___${T}___${string}`;

export type Template<T extends string> = UnionToIntersection<MonoTemplate<T>>;

export function renderTemplate<T extends Record<string, string>>(template: Template<StringKey<T>>, values: T) {
  return Object.keys(values).reduce((acc, key) => {
    return acc.replace(`___${key}___`, values[key]);
  }, template as string);
};