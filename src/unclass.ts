import { mutated } from "./utils";

function guessName(func: Function) {
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

export function unclass<T extends object & {}>(factory: () => T) {
  
  const BRAND = Symbol(factory.name);

  function test(object: any): object is T {
    return object && typeof object === 'object' && object[BRAND] === true;
  };

  const unclassedTypeName = `Unclassed<${guessName(factory)}>`;
  return mutated(
    function Factory() {
      return mutated(factory(), {
        [BRAND]: true,
        [Symbol.toStringTag]: unclassedTypeName
      })
    }, {
      test,
      toString: () => unclassedTypeName
    }
  );

};