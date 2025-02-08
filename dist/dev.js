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
  function $with(...args) {
    return args.pop()(...args);
  }
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function mutated(obj, partial) {
    mutate(obj, partial);
    return obj;
  }
  function $throw(messageOrError) {
    throw messageOrError instanceof Error ? messageOrError : new Error(messageOrError);
  }
  function tap(target, preprocess) {
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
  var TYPE_MARKER = Symbol("typeMarker");
  function typeMark(description, value) {
    return mutated(value, { [TYPE_MARKER]: description });
  }
  function typeMarkTester(description) {
    return function test(value) {
      return value && ["object", "function"].includes(typeof value) && TYPE_MARKER in value && value[TYPE_MARKER] === description;
    };
  }
  function combinedTypeguard(guard1, guard2) {
    return (value) => guard1(value) || guard2(value);
  }
  function $try(fn, fallback) {
    try {
      return fn();
    } catch (e) {
      return fallback ? infer(fallback, e) : $throw(e);
    }
  }

  // src/weaks.ts
  var BREAK = Symbol("BREAK");
  var PhantomSet = class {
    set = /* @__PURE__ */ new Set();
    *iterator() {
      for (const ref2 of this.set) {
        const value = ref2.deref();
        if (value) yield [value, ref2];
        else this.set.delete(ref2);
      }
      ;
    }
    add(value) {
      this.set.add(new WeakRef(value));
      return this;
    }
    has(value) {
      for (const v of this) {
        if (v === value) return true;
      }
      return false;
    }
    clear() {
      this.set.clear();
    }
    delete(value) {
      for (const [v, ref2] of this.iterator()) {
        if (v === value) {
          this.set.delete(ref2);
          return true;
        }
      }
      return false;
    }
    get size() {
      return [...this].length;
    }
    forEach(callback) {
      for (const value of this) {
        if (callback(value) === BREAK) break;
      }
    }
    map(callback) {
      return [...this].map(callback);
    }
    [Symbol.iterator]() {
      return function* () {
        for (const [value] of this.iterator()) {
          yield value;
        }
      }.call(this);
    }
  };
  function WeakBiMap() {
    const relations = /* @__PURE__ */ new WeakMap();
    function self(...args) {
      return updateRelations(...args);
    }
    ;
    function updateRelations(node, relative, remove) {
      const relatives = getOrSet(relations, node, new PhantomSet());
      if (relative === null) {
        relatives.forEach((relative2) => updateRelations(relative2, node, null));
      } else if (relative)
        [
          [relatives, relative],
          [getOrSet(relations, relative, new PhantomSet()), node]
        ].forEach(
          ([relatives2, relative2]) => remove === null ? relatives2.delete(relative2) : relatives2.add(relative2)
        );
      return [...relatives];
    }
    ;
    return self;
  }

  // src/smork/newRefs.ts
  var maxIteration = 0;
  var iteration = Metabox((root) => maxIteration++);
  var allRefs = new PhantomSet();
  var $RootRef = Symbol("RootRef");
  function RootRef(value) {
    const ref2 = addRefMethods(typeMark($RootRef, Box(
      () => {
        detectEffect(ref2);
        detectComputees(ref2);
        return value;
      },
      (setValue) => {
        if (value === setValue) return;
        valueChanged(ref2, true);
        [ref2, ...computees_roots(ref2)].forEach(scheduleEffects);
        value = setValue;
        iteration(ref2, inc);
      }
    )));
    allRefs.add(ref2);
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
    const ref2 = addRefMethods(typeMark($ReadonlyComputedRef, Box(
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
            cachedValue = tap(
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
    )));
    fixedSources && fixedComputeeSources(ref2, fixedSources);
    allRefs.add(ref2);
    return ref2;
  }
  var isReadonlyComputedRef = typeMarkTester($ReadonlyComputedRef);
  var $WritableComputedRef = Symbol("WritableComputedRef");
  function WritableComputedRef(getter, setter, fixedSources) {
    const ref2 = addRefMethods(typeMark($WritableComputedRef, Box(
      ReadonlyComputedRef(getter, fixedSources),
      setter
    )));
    allRefs.add(ref2);
    return ref2;
  }
  var isWritableComputedRef = typeMarkTester($WritableComputedRef);
  var isComputedRef = combinedTypeguard(isReadonlyComputedRef, isWritableComputedRef);
  var isRef = combinedTypeguard(isRootRef, isComputedRef);
  var isWritableRef = combinedTypeguard(isRootRef, isWritableComputedRef);
  function ComputedRef(getter, setter) {
    return setter ? WritableComputedRef(getter, setter) : ReadonlyComputedRef(getter);
  }
  var effects_sources = WeakBiMap();
  var $Effect = Symbol("Effect");
  var currentEffect = Undefined();
  var scheduledEffects = /* @__PURE__ */ new Set();
  var valueChanged = Metabox((ref2) => Null());
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
        (source) => isReadonlyComputedRef(source) && valueChanged(source, null)
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
      (changed) => changed === null ? (ref2(), // This will update the valueChanged
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
  function DependentRef(source, mapper, backMapper) {
    return backMapper ? WritableComputedRef(
      () => mapper(source()),
      isWritableRef(source) ? (value) => source(backMapper(value)) : $throw("Cannot use a backMapper with a readonly ref."),
      [source]
    ) : ReadonlyComputedRef(() => mapper(source()), [source]);
  }
  function Ref(getterValueOrSource, setterOrMapper, backMapper) {
    return isRef(getterValueOrSource) ? DependentRef(
      getterValueOrSource,
      setterOrMapper ?? $throw("A mapper function must be provided when the first argument is a ref."),
      backMapper
    ) : isFunction(getterValueOrSource) ? ComputedRef(getterValueOrSource, setterOrMapper) : RootRef(getterValueOrSource);
  }
  var ref = Ref;
  function toref(source) {
    return isRef(source) ? source : isFunction(source) ? ReadonlyComputedRef(source) : RootRef(source);
  }
  function watch(sourceOrCallback, callback) {
    return Effect(callback ? () => callback(toref(sourceOrCallback)()) : sourceOrCallback);
  }
  var effect = watch;
  function RefMethods(r) {
    function to(mapper, backMapper) {
      return backMapper ? isWritableRef(r) ? Ref(r, mapper, backMapper) : $throw("Cannot use a backMapper with a readonly ref.") : Ref(r, mapper);
    }
    ;
    return {
      to,
      watch: (callback) => watch(r, callback)
    };
  }
  function addRefMethods(ref2) {
    return Object.assign(ref2, RefMethods(ref2));
  }
  var number = RootRef(0);
  var string = number.to(String);
  $try(() => {
    const upper = string.to((s) => s.toUpperCase(), (s) => s.toLowerCase());
  }, console.warn);
  var twoWayString = number.to(String, Number);
  var twoWayUpper = twoWayString.to((s) => s.toUpperCase(), (s) => s.toLowerCase());

  // src/scripts/dev.ts
  Object.assign(window, { RootRef, ReadonlyComputedRef, Effect, Ref, ref, effect, watch, allRefs });
})();
}}).main();
