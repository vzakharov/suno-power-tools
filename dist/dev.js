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
      return TYPE_MARKER in value && value[TYPE_MARKER] === description;
    };
  }

  // src/smork/newRefs.ts
  var maxIteration = 0;
  var iteration = Metabox((root) => maxIteration++);
  var $RootRef = Symbol("RootRef");
  function RootRef(value) {
    const ref = typeMark($RootRef, Box(
      () => {
        detectEffect(ref);
        detectComputees(ref);
        return value;
      },
      (setValue) => {
        if (value === setValue) return;
        [ref, ...computees_roots(ref)].forEach(scheduleEffects);
        value = setValue;
        iteration(ref, inc);
      }
    ));
    return ref;
  }
  var isRootRef = typeMarkTester($RootRef);
  var computees = /* @__PURE__ */ new Set();
  var computees_roots = WeakBiMap();
  var lastMaxRootIteration = Metabox((ref) => 0);
  var fixedComputeeSources = Metabox((ref) => Null());
  var $ComputedRef = Symbol("ComputedRef");
  function detectComputees(ref) {
    computees.forEach((computee) => {
      const fixedSources = fixedComputeeSources(computee);
      if (!fixedSources || fixedSources.some((source) => isRootRef(source) ? source === ref : computees.has(source))) {
        computees_roots(computee, ref);
      }
      ;
    });
  }
  function ComputedRef(getter, fixedSources) {
    let cachedValue = NotSet();
    const ref = typeMark($ComputedRef, Box(
      () => {
        detectEffect(ref);
        if (cachedValue === NOT_SET || $with(maxOf(computees_roots(ref), iteration), (maxRootIteration) => {
          if (maxRootIteration > lastMaxRootIteration(ref)) {
            lastMaxRootIteration(ref, maxRootIteration);
            return true;
          }
          ;
        })) {
          computees_roots(ref, null);
          computees.add(ref);
          try {
            cachedValue = beforeReturning(
              getter(),
              (newValue) => valueChanged(ref, cachedValue !== newValue)
            );
          } finally {
            computees.delete(ref);
          }
          ;
        } else {
          computees.forEach((computee) => {
            computees_roots(ref).forEach((root) => {
              computees_roots(computee, root);
            });
          });
        }
        return cachedValue;
      }
    ));
    fixedSources && fixedComputeeSources(ref, fixedSources);
    return ref;
  }
  var isComputedRef = typeMarkTester($ComputedRef);
  var effects_sources = WeakBiMap();
  var $Effect = Symbol("Effect");
  var currentEffect = Undefined();
  var scheduledEffects = /* @__PURE__ */ new Set();
  var valueChanged = Metabox((ref) => Undefined());
  var pausedEffects = /* @__PURE__ */ new WeakSet();
  function Effect(callback, fixedSources) {
    const effect = typeMark($Effect, (command) => {
      switch (command) {
        case 0 /* PAUSE */:
          pausedEffects.add(effect);
          return;
        case 1 /* RESUME */:
          pausedEffects.delete(effect);
        case 2 /* DESTROY */:
          effects_sources(effect, null);
          return;
      }
      ;
      if (fixedSources) return callback();
      const sources = [...effects_sources(effect)];
      effects_sources(effect, null);
      sources.forEach(
        (source) => isComputedRef(source) && valueChanged(source, false)
        // Reset the valueChanged
      );
      currentEffect = effect;
      try {
        callback();
      } finally {
        currentEffect = void 0;
      }
      ;
    });
    fixedSources ? fixedSources.forEach((source) => effects_sources(effect, source)) : effect();
    return effect;
  }
  var isEffect = typeMarkTester($Effect);
  function detectEffect(ref) {
    currentEffect && effects_sources(currentEffect, ref);
  }
  function scheduleEffects(ref) {
    if (isRootRef(ref) || $with(
      valueChanged(ref),
      (changed) => changed === void 0 ? (ref(), // This will update the valueChanged
      valueChanged(ref) ?? $throw("valueChanged not updated")) : changed
    )) {
      effects_sources(ref).forEach((effect) => {
        if (pausedEffects.has(effect)) return;
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
        scheduledEffects.add(effect);
      });
    }
    ;
  }

  // src/scripts/dev.ts
  Object.assign(window, { RootRef, ComputedRef, Effect });
})();
}}).main();
