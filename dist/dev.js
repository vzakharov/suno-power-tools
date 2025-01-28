(vovas = { main() {
(() => {
  // src/types.ts
  var BRAND = Symbol("brand");
  var TypescriptErrorMarker = Symbol("typescript-error");
  var TypescriptError = mutated(
    (message) => ({ [TypescriptErrorMarker]: message }),
    {
      test: (candidate) => TypescriptErrorMarker in candidate
    }
  );

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function mutated(obj, partial) {
    mutate(obj, partial);
    return obj;
  }
  function $throw(message) {
    throw new Error(message);
  }

  // src/callable.ts
  var Callable = function() {
    const func = this.constructor.prototype.call;
    function apply() {
      return func.apply(apply, arguments);
    }
    ;
    Object.setPrototypeOf(apply, this.constructor.prototype);
    Object.getOwnPropertyNames(this).forEach((key) => {
      Object.defineProperty(apply, key, Object.getOwnPropertyDescriptor(func, key) ?? $throw(`Failed to get descriptor for ${key}`));
    });
    return apply;
  };
  Callable.prototype = Object.create(Function.prototype);
  var SomeClass = class extends Callable {
    call(arg) {
      return arg.length;
    }
    otherMethod() {
      return "hello";
    }
  };
  var instance = new SomeClass();
  console.log(instance("hello"));
  console.log(instance.otherMethod());

  // src/scripts/dev.ts
  mutate(window, { Callable });
})();
}}).main();
