import { Typeguard } from "./types";
import { mutated } from "./utils";

const $MARKERS = Symbol('MARKERS');
export type TypeMarked<Marker extends symbol> = {
  readonly [$MARKERS]: Marker[];
};

export function TypeMarked<Marker extends symbol, T extends {}>(marker: Marker, value: T) {
  return mutated(value, { 
    [$MARKERS]: [
      ...value[$MARKERS] ?? [],
      marker
    ] 
  }) as T & TypeMarked<Marker>;
};

export function typeMarkTester<Marker extends symbol>(marker: Marker): Typeguard<TypeMarked<Marker>>;
export function typeMarkTester<T extends TypeMarked<any>>(marker: T extends TypeMarked<infer M> ? M : never): Typeguard<T>;
export function typeMarkTester<Marker extends symbol>(marker: Marker) {

  return function test(value: any): value is TypeMarked<Marker> {
    return isTypeMarked(marker, value);
  };

};

export function isTypeMarked<Marker extends symbol>(marker: Marker, value: any): value is TypeMarked<Marker> {
  return value
    && ['object', 'function'].includes(typeof value)
    && value[$MARKERS]?.includes(marker);
};