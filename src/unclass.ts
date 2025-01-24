import { concat } from "./lodashish";
import { mutated } from "./utils";

export function unclass<TName extends string, T extends object & {}>(name: TName, factory: () => T) {
  
  const BRAND = Symbol(factory.name);

  function test(object: any): object is T {
    return object && typeof object === 'object' && object[BRAND] === true;
  };

  const unclassedTypeName = concat('Unclassed<', name, '>');

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