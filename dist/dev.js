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
  function Undefined(value) {
    return value;
  }
  var BRAND = Symbol("brand");
  function infer(inferable, value) {
    return isFunction(inferable) ? inferable(value) : inferable;
  }

  // src/utils.ts
  function Null() {
    return null;
  }
  function $with(obj, fn) {
    return fn(obj);
  }
  function $throw(message) {
    throw new Error(message);
  }
  function beforeReturning(target, preprocess) {
    preprocess(target);
    return target;
  }
  function nextTick(callback) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(callback?.());
      }, 0);
    });
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
  function createBox(...[getterOrValue, setter]) {
    if (!isFunction(getterOrValue)) {
      let value = getterOrValue;
      return createBoxWithGetter(() => value, (setValue) => value = setValue);
    } else {
      return createBoxWithGetter(getterOrValue, setter);
    }
    ;
    function createBoxWithGetter(getter, setter2) {
      return function box(setValue) {
        if (setValue === void 0) {
          return getter();
        } else {
          if (!setter2) {
            throw new TypeError("Cannot set value on a read-only box");
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
      };
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
      return setValue ? metadata(subject)(setValue) : metadata(subject)();
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
  function WeakBiMap() {
    const relations = /* @__PURE__ */ new WeakMap();
    function self(...args) {
      return updateRelations(...args);
    }
    ;
    function updateRelations(node, relative, remove) {
      const relatives = getOrSet(relations, node, /* @__PURE__ */ new Set());
      if (relative === null) {
        relatives.forEach(
          (relative2) => updateRelations(relative2, node, null)
        );
      } else if (relative)
        [
          [relatives, relative],
          [getOrSet(relations, relative, /* @__PURE__ */ new Set()), node]
        ].forEach(
          ([relatives2, relative2]) => remove === null ? relatives2.delete(relative2) : relatives2.add(relative2)
        );
      return [...relatives];
    }
    ;
    return self;
  }
  var TYPE_MARKER = Symbol("typeMarker");
  function typeMark(description, value) {
    return Object.defineProperty(value, TYPE_MARKER, { value: description });
  }
  function typeMarkTester(description) {
    return function test(value) {
      return value && typeof value === "object" && TYPE_MARKER in value && value[TYPE_MARKER] === description;
    };
  }
  function combinedTypeguard(guard1, guard2) {
    return (value) => guard1(value) || guard2(value);
  }

  // src/smork/newRefs.ts
  var maxIteration = 0;
  var iteration = Metabox((root) => maxIteration++);
  var $RootRef = Symbol("RootRef");
  function RootRef(value) {
    const ref2 = typeMark($RootRef, Box(
      () => {
        detectEffect(ref2);
        detectComputees(ref2);
        return value;
      },
      (setValue) => {
        if (value === setValue) return;
        [ref2, ...computees_roots(ref2)].forEach(scheduleEffects);
        value = setValue;
        iteration(ref2, inc);
      }
    ));
    return ref2;
  }
  var isRootRef = typeMarkTester($RootRef);
  var computees = /* @__PURE__ */ new Set();
  var computees_roots = WeakBiMap();
  var lastMaxRootIteration = Metabox((ref2) => 0);
  var fixedComputeeSources = Metabox((ref2) => Null());
  var $ReadonlyComputedRef = Symbol("ReadonlyComputedRef");
  function detectComputees(ref2) {
    computees.forEach((computee) => {
      const fixedSources = fixedComputeeSources(computee);
      if (!fixedSources || fixedSources.some((source) => isRootRef(source) ? source === ref2 : computees.has(source))) {
        computees_roots(computee, ref2);
      }
      ;
    });
  }
  function ReadonlyComputedRef(getter, fixedSources) {
    let cachedValue = NotSet();
    const ref2 = typeMark($ReadonlyComputedRef, Box(
      () => {
        detectEffect(ref2);
        if (cachedValue === NOT_SET || $with(maxOf(computees_roots(ref2), iteration), (maxRootIteration) => {
          if (maxRootIteration > lastMaxRootIteration(ref2)) {
            lastMaxRootIteration(ref2, maxRootIteration);
            return true;
          }
          ;
        })) {
          computees_roots(ref2, null);
          computees.add(ref2);
          try {
            cachedValue = beforeReturning(
              getter(),
              (newValue) => valueChanged(ref2, cachedValue !== newValue)
            );
          } finally {
            computees.delete(ref2);
          }
          ;
        } else {
          computees.forEach((computee) => {
            computees_roots(ref2).forEach((root) => {
              computees_roots(computee, root);
            });
          });
        }
        return cachedValue;
      }
    ));
    fixedSources && fixedComputeeSources(ref2, fixedSources);
    return ref2;
  }
  var isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef);
  var $WritableComputedRef = Symbol("WritableComputedRef");
  function WritableComputedRef(getter, setter, fixedSources) {
    const ref2 = typeMark($WritableComputedRef, Box(
      ReadonlyComputedRef(getter, fixedSources),
      setter
    ));
    return ref2;
  }
  var isWritableComputedRef = typeMarkTester($WritableComputedRef);
  var isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef);
  var isRef = combinedTypeguard(isRootRef, isComputedRef);
  var effects_sources = WeakBiMap();
  var $Effect = Symbol("Effect");
  var currentEffect = Undefined();
  var scheduledEffects = /* @__PURE__ */ new Set();
  var valueChanged = Metabox((ref2) => Undefined());
  var pausedEffects = /* @__PURE__ */ new WeakSet();
  var destroyedEffects = /* @__PURE__ */ new WeakSet();
  function Effect(callback, fixedSources) {
    const effect2 = typeMark($Effect, (command) => {
      if (destroyedEffects.has(effect2))
        throw "This effect has been destroyed and cannot be used anymore.";
      if (command === 0 /* PAUSE */) {
        pausedEffects.add(effect2);
        return;
      } else if (command === 1 /* RESUME */) {
        pausedEffects.delete(effect2);
      } else if (command === 2 /* DESTROY */) {
        effects_sources(effect2, null);
        destroyedEffects.add(effect2);
        return;
      }
      ;
      if (fixedSources) return callback();
      const sources = [...effects_sources(effect2)];
      effects_sources(effect2, null);
      sources.forEach(
        (source) => isReadonlyComputedRef(source) && valueChanged(source, false)
        // Reset the valueChanged
      );
      currentEffect = effect2;
      try {
        callback();
      } finally {
        currentEffect = void 0;
      }
      ;
    });
    fixedSources ? fixedSources.forEach((source) => effects_sources(effect2, source)) : effect2();
    return effect2;
  }
  var isEffect = typeMarkTester($Effect);
  function detectEffect(ref2) {
    currentEffect && effects_sources(currentEffect, ref2);
  }
  function scheduleEffects(ref2) {
    if (isRootRef(ref2) || $with(
      valueChanged(ref2),
      (changed) => changed === void 0 ? (ref2(), // This will update the valueChanged
      valueChanged(ref2) ?? $throw("valueChanged not updated")) : changed
    )) {
      effects_sources(ref2).forEach((effect2) => {
        if (pausedEffects.has(effect2)) return;
        if (!scheduledEffects.size) {
          nextTick(() => {
            try {
              scheduledEffects.forEach(infer);
            } finally {
              scheduledEffects.clear();
            }
            ;
          });
        }
        ;
        scheduledEffects.add(effect2);
      });
    }
    ;
  }
  function ref(first, second, third) {
    return isRef(first) ? second ? third ? WritableComputedRef(() => second(first()), (value) => first(third(value)), [first]) : ReadonlyComputedRef(() => second(first()), [first]) : $throw("A mapper function must be provided when the first argument is a ref.") : isFunction(first) ? second ? WritableComputedRef(first, second) : ReadonlyComputedRef(first) : RootRef(first);
  }
  function toref(source) {
    return isRef(source) ? source : isFunction(source) ? ReadonlyComputedRef(source) : RootRef(source);
  }
  function effect(callback) {
    return Effect(callback);
  }
  function watch(source, callback) {
    return Effect(() => callback(toref(source)()));
  }

  // src/scripts/dev.ts
  Object.assign(window, { RootRef, ReadonlyComputedRef, Effect, ref, effect, watch });
})();
}}).main();
