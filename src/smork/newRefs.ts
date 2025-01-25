import { Defined, Func } from "../types";
import { doppelganger, Register } from "../utils";

const values = Register<any>();

export type Ref<T = any> = ReturnType<typeof Ref<T>>;

export function Ref<T>(initValue: T) {

  const value = values(ref, initValue);

  function ref(): T;
  function ref(setValue: T): void;
  function ref(setValue?: T) {
    if (arguments.length) {
      value(setValue as T);
    } else {
      return value();
    }
  };

  return ref;

};