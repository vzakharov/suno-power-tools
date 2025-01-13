const optionality = Symbol('optionality');

type RequiredProp<T> = T & { [optionality]: 'required' };
type OptionalProp<T> = T & { [optionality]: 'optional' };
// Just for typing purposes, we'll never actually have a value with an `[optionality]` key. See branded types

export function required<T>() {
  return undefined as unknown as RequiredProp<T>;
};

export function optional<T>() {
  return undefined as unknown as OptionalProp<T>;
};

// If `unclass` is called with a single object, it's treated as a schema
const Machine = unclass(
  {
    // default values for optional props
    name: 'Machine',
    // required props
    manufacturer: required<string>(),
    // optional props
    model: optional<string>(),
  }
);

type Machine = Untype<typeof Machine>
const cellphone = Machine({
  manufacturer: 'Apple',
  model: 'iPhone 293',
});

// If called with a factory function, it's treated as a factory
const Animal = unclass(
  (props: {
    name: string,
    // optional prop
    species?: string,
  }) => props
);

type Animal = Untype<typeof Animal>;
const dog = Animal({
  name: 'Dog',
  species: 'Canis Lupus Familiaris',
});

// If called with an array as the first argument, it's treated as the inheritance chain, at that:
// - If there are totally three arguments, the second one is treated as the initialization value from the base class(es)
// - If the initialization value is given, it won't be required for initializing the new object
// - The last argument is treated as either a schema or a factory function
// - An additional argument is passed to the factory function, representing the `super` object, i.e. the object returned by the base class(es)
// - The super object is merged with the new object automatically, without the need to spread it explicitly
// - The type for the super object is inferred from the base class(es) automatically
const Human = unclass([Animal],
  { species: "H*mo Sapiens" }, // Can't write with an o because copilot treats this as a slur lol
  (props: {
    nickname?: string,
  }, $super) => {
    const { name } = $super;
    const { nickname } = props;
    return {
      ...props,
      get printName() {
        return nickname ? `${name} a.k.a. ${nickname}` : name;
      }
    };
  }
);

type Human = Untype<typeof Human>;
const bob = Human({
  name: 'Bob Peterson',
  nickname: 'Bobby',
});

// If just the inheritance chain is given, the resulting objects will be merged together, from left to right
const Cyborg = unclass([Human, Machine]);

type Cyborg = Untype<typeof Cyborg>;

const terminator = Cyborg({
  name: 'T-800',
  manufacturer: 'Skynet',
  nickname: 'Arnie',
});

// export function verboseUnclass<
//   TChain extends UnclassChain<any>,
//   TInit extends UnclassInit<TChain>,
//   TSchema extends UnclassSchema<TChain, TInit>
//   TFactor