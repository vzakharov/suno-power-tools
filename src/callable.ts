import { Func } from "./types";
import { $throw } from "./utils";

export const CallableMethod = Symbol('CallableMethod');

export const Callable = (
  function() {
    const func = this.constructor.prototype[CallableMethod];
    function apply() {
      return func.apply(apply, arguments);
    };
    Object.setPrototypeOf(apply, this.constructor.prototype);
    Object.getOwnPropertyNames(this).forEach((key) => {
      Object.defineProperty(apply, key, Object.getOwnPropertyDescriptor(func, key) ?? $throw(`Failed to get descriptor for ${key}`));
    });
    return apply;
  }
) as unknown as {
  new <F extends Func>() : F & {
    [CallableMethod](...args: Parameters<F>): ReturnType<F>;
  };
};

Callable.prototype = Object.create(Function.prototype);

// example

class SomeClass extends Callable<Func<[string], number>> {

  [CallableMethod](arg: string) {
    return arg.length;
  };

  otherMethod() {
    return 'hello';
  };
  
};

const instance = new SomeClass();
console.log(instance('hello')); // 5
console.log(instance.otherMethod()); // 'hello'