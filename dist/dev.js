(vovas = { main() {
(() => {
  // src/lodashish.ts
  function isFunction(value) {
    return typeof value === "function";
  }
  function maxOf(iterables, callback) {
    return Math.max(...[...iterables].map(callback));
  }

  // src/types.ts
  var NOT_SET = Symbol("NOT_SET");
  function NotSet() {
    return NOT_SET;
  }
  var BRAND = Symbol("brand");
  function infer(inferable, value) {
    return isFunction(inferable) ? inferable(value) : inferable;
  }
  var TypingError = class extends Error {
    constructor(message) {
      super(message);
    }
  };

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function getOrSet(map, key, defaultValue) {
    if (map.has(key)) {
      return map.get(key);
    }
    ;
    const value = infer(defaultValue, key);
    map.set(key, value);
    return value;
  }
  var CannotSetError = () => new TypingError("Cannot set value on a read-only box");
  function createBox(...[getterOrValue, setter]) {
    if (!isFunction(getterOrValue)) {
      let value = getterOrValue;
      return createBoxWithGetter(() => value, (setValue) => value = setValue);
    } else {
      return createBoxWithGetter(getterOrValue, setter);
    }
    ;
    function createBoxWithGetter(getter, setter2) {
      function box(setValue) {
        if (setValue === void 0) {
          return getter();
        } else {
          if (!setter2 || setValue instanceof TypingError) {
            throw CannotSetError();
          }
          ;
          if (isFunction(setValue)) {
            return box(setValue(getter()));
          } else {
            setter2(setValue);
            return setValue;
          }
          ;
        }
        ;
      }
      ;
      return box;
    }
    ;
  }
  function Box(...args) {
    return createBox(...args);
  }
  function Metadata(initializer) {
    const metadatas = /* @__PURE__ */ new WeakMap();
    return (subject) => getOrSet(metadatas, subject, () => initializer(subject));
  }
  function createMetabox(initializer) {
    const metadata = Metadata((subject) => {
      const [getter, setter] = initializer(subject);
      return createBox(getter, setter);
    });
    function metabox(subject, setValue) {
      return metadata(subject)(setValue);
    }
    ;
    return metabox;
  }
  function Metabox(initializer) {
    return createMetabox((subject) => [initializer(subject)]);
  }
  function inc(value) {
    return value + 1;
  }

  // src/smork/newNewRefs.ts
  var lastMaxRootIteration = Metabox((ref) => 0);
  var sourceRoots = Metabox((ref) => /* @__PURE__ */ new Set());
  var maxIteration = 0;
  var iteration = Metabox((root) => maxIteration++);
  var computees = /* @__PURE__ */ new Set();
  function RootRef(value) {
    const self = Box(
      () => {
        computees.forEach((computee) => {
          sourceRoots(computee).add(self);
          if (lastMaxRootIteration(computee) < iteration(self)) {
            lastMaxRootIteration(computee, iteration(self));
          }
          ;
        });
        return value;
      },
      (setValue) => {
        value = setValue;
        iteration(self, inc);
      }
    );
    return self;
  }
  function ComputedRef(getter) {
    let cachedValue = NotSet();
    const self = Box(
      () => {
        if (cachedValue === NOT_SET) {
          return recompute();
        } else {
          const maxRootIteration = maxOf(sourceRoots(self), iteration);
          if (maxRootIteration > lastMaxRootIteration(self)) {
            lastMaxRootIteration(self, maxRootIteration);
            return recompute();
          }
          ;
          return cachedValue;
        }
        ;
        function recompute() {
          sourceRoots(self).clear();
          computees.add(self);
          try {
            return cachedValue = getter();
          } finally {
            computees.delete(self);
          }
          ;
        }
        ;
      }
    );
    return self;
  }

  // src/scripts/dev.ts
  mutate(window, { RootRef, ComputedRef });
})();
}}).main();
