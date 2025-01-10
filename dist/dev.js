(() => {
  // src/lodashish.ts
  function isFunction(value) {
    return typeof value === "function";
  }

  // src/smork/refs.ts
  //! Smork, the smol framework
  function ref(arg1, arg2) {
    return isFunction(arg1) ? arg2 ? new BridgedRef(arg1, arg2) : new ComputedRef(arg1) : new Ref(arg1);
  }
  var BaseRef = class {
    constructor(_value) {
      this._value = _value;
    }
    watchers = [];
    activeWatchers = /* @__PURE__ */ new WeakSet();
    get() {
      currentComputedPreHandler?.(this);
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
      this.watchers.push(watcher);
    }
    /**
     * @alias watch
     */
    onChange = this.watch;
    // just an alias
    unwatch(watcher) {
      this.watchers = this.watchers.filter((w) => w !== watcher);
    }
    get value() {
      return this.get();
    }
    map(getter) {
      return new ComputedRef(() => getter(this.value));
    }
    compute = this.map;
  };
  var Ref = class extends BaseRef {
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
      return new BridgedRef(
        () => forward(this.value),
        (value) => this.set(backward(value))
      );
    }
  };
  var currentComputedPreHandler = void 0;
  var ComputedRef = class extends Ref {
    constructor(getter) {
      if (currentComputedPreHandler) {
        throw new Error("smork: currentComputedPreHandler is already set (this should never happen)");
      }
      ;
      try {
        currentComputedPreHandler = (ref2) => {
          ref2.watch(() => this._set(getter()));
        };
        super(getter());
      } finally {
        currentComputedPreHandler = void 0;
      }
      ;
    }
  };
  function computed(getter) {
    return new ComputedRef(getter);
  }
  var BridgedRef = class extends Ref {
    constructor(getter, setter) {
      const computedRef = new ComputedRef(getter);
      super(computedRef.value);
      this.setter = setter;
      computedRef.watch((value) => this._set(value));
    }
    set(value) {
      this.setter(value);
      if (this.value !== value) {
        throw new Error("smork: bridge value did not change to the one being set");
      }
      ;
    }
  };
  function useNot(ref2) {
    return computed(() => {
      return !ref2.value;
    });
  }

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/dev.ts
  mutate(window, { ref, computed, useNot, BaseRef, Ref, ComputedRef, BridgedRef });
})();
