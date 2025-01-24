(vovas = { main() {
(() => {
  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function mutated(obj, partial) {
    mutate(obj, partial);
    return obj;
  }

  // src/unclass.ts
  function guessName(func) {
    const name = func.name;
    if (name) {
      return name;
    }
    const match = func.toString().match(/^function\s*([^\s(]+)/);
    if (match) {
      return match[1];
    }
    return "anonymous";
  }
  function unclass(factory) {
    const BRAND = Symbol(factory.name);
    function test(object) {
      return object && typeof object === "object" && object[BRAND] === true;
    }
    ;
    const unclassedTypeName = `Unclassed<${guessName(factory)}>`;
    return mutated(
      function Factory() {
        return mutated(factory(), {
          [BRAND]: true,
          [Symbol.toStringTag]: unclassedTypeName
        });
      },
      {
        test,
        toString: () => unclassedTypeName
      }
    );
  }

  // src/scripts/dev.ts
  mutate(window, { unclass });
})();
}}).main();
