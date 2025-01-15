(vovas = { main() {
(() => {
  // src/lodashish.ts
  function mapValues(obj, mapper) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, mapper(value, key)])
    );
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function assign(obj, partial) {
    return Object.assign(obj, partial);
  }

  // src/smork/refs.ts
  //! Smork, the smol framework
  var SmorkError = class extends Error {
    constructor(message) {
      super(`smork: ${message}`);
    }
  };
  function ref(valueOrGetter, setter) {
    return isFunction(valueOrGetter) ? computed(valueOrGetter, setter) : new Ref(valueOrGetter);
  }
  var ReadonlyRef = class {
    constructor(_value) {
      this._value = _value;
    }
    watchers = /* @__PURE__ */ new Set();
    activeWatchers = /* @__PURE__ */ new WeakSet();
    get() {
      currentComputedTracker?.(this);
      return this._value;
    }
    _set(value) {
      const { _value: oldValue } = this;
      if (value !== this._value) {
        this._value = value;
        try {
          for (const watcher of this.watchers) {
            if (this.activeWatchers.has(watcher)) {
              console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");
              return;
            }
            this.activeWatchers.add(watcher);
            watcher(value, oldValue);
          }
          ;
        } finally {
          this.activeWatchers = /* @__PURE__ */ new WeakSet();
        }
        ;
      }
    }
    runAndWatch(watcher) {
      watcher(this._value, this._value);
      this.watch(watcher);
    }
    /**
     * @alias runAndWatch
     */
    watchImmediate = this.runAndWatch;
    watch(watcher) {
      this.watchers.add(watcher);
    }
    /**
     * @alias watch
     */
    onChange = this.watch;
    // just an alias
    unwatch(watcher) {
      this.watchers.delete(watcher);
    }
    get value() {
      return this.get();
    }
    map(getter) {
      return new ComputedRef(() => getter(this.value));
    }
    compute = this.map;
    merge(mergee) {
      return mergee ? computed(() => ({
        ...this.value,
        ...unref(mergee)
      })) : this;
    }
    uses(methods) {
      return assign(this, mapValues(methods, this.map));
    }
  };
  var Ref = class extends ReadonlyRef {
    set(value) {
      this._set(value);
    }
    set value(value) {
      this.set(value);
    }
    get value() {
      return this.get();
    }
    bridge(forward, backward) {
      return new WritableComputedRef(
        () => forward(this.value),
        (value) => this.set(backward(value))
      );
    }
  };
  var currentComputedTracker = void 0;
  var ComputedRef = class extends Ref {
    constructor(getter) {
      super(void 0);
      this.getter = getter;
      this.track();
    }
    dependencies = /* @__PURE__ */ new Set();
    track = () => {
      if (currentComputedTracker) {
        throw new SmorkError(
          "Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?"
        );
      }
      ;
      this.dependencies.forEach((ref2) => ref2.unwatch(this.track));
      this.dependencies = /* @__PURE__ */ new Set();
      try {
        currentComputedTracker = (ref2) => {
          ref2.watch(this.track);
          this.dependencies.add(ref2);
        };
        this._set(this.getter());
      } finally {
        currentComputedTracker = void 0;
      }
    };
  };
  var WritableComputedRef = class extends Ref {
    constructor(getter, setter, allowMismatch = false) {
      const computedRef = new ComputedRef(getter);
      super(computedRef.value);
      this.setter = setter;
      this.allowMismatch = allowMismatch;
      computedRef.watch((value) => this._set(value));
    }
    set(value) {
      this.setter(value);
      if (!this.allowMismatch && this.value !== value) {
        throw new SmorkError("Setter did not update the value. If you want to allow this, set the allowMismatch property to true.");
      }
      ;
    }
  };
  function computed(getter, setter) {
    return setter ? new WritableComputedRef(getter, setter) : new ComputedRef(getter);
  }
  function useNot(ref2) {
    return computed(() => {
      return !ref2.value;
    });
  }
  function refResolver(arg) {
    return (ifRef, ifFunction, ifValue) => {
      return arg instanceof ReadonlyRef ? ifRef(arg) : isFunction(arg) ? ifFunction(arg) : ifValue(arg);
    };
  }
  function unref(arg) {
    return refResolver(arg)(
      (ref2) => ref2.value,
      (fn) => fn(),
      (value) => value
    );
  }

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/dev.ts
  mutate(window, { ref, computed, useNot, BaseRef: ReadonlyRef, Ref, ComputedRef, WritableComputedRef });
})();
}}).main();
