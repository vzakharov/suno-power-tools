(() => {
  // src/lodashish.ts
  function isFunction(value) {
    return typeof value === "function";
  }

  // src/smork.ts
  //! Smork, the smol framework
  //! Refs
  function ref(arg) {
    return isFunction(arg) ? new ComputedRef(arg) : new Ref(arg);
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
  };
  var Ref = class extends BaseRef {
    set = super._set;
    set value(value) {
      this.set(value);
    }
    get value() {
      return this.get();
    }
  };
  var currentComputedPreHandler = void 0;
  var ComputedRef = class extends BaseRef {
    constructor(getter) {
      var __super = (...args) => {
        super(...args);
        this.getter = getter;
        return this;
      };
      if (currentComputedPreHandler) {
        throw new Error("smork: currentComputedPreHandler is already set (this should never happen)");
      }
      ;
      try {
        currentComputedPreHandler = (ref2) => {
          ref2.watch(() => this.refresh());
        };
        __super(getter());
      } finally {
        currentComputedPreHandler = void 0;
      }
      ;
    }
    refresh() {
      this._set(this.getter());
    }
  };
  function computed(getter) {
    return new ComputedRef(getter);
  }
  function useNot(ref2) {
    return computed(() => {
      return !ref2.value;
    });
  }
  //! Elements
  var SUPPORTED_TAGS = [
    "html",
    "head",
    "style",
    "script",
    "body",
    "div",
    "h3",
    "p",
    "a",
    "img",
    "audio",
    "input",
    "label",
    "button"
  ];
  var {
    html,
    head,
    style,
    script,
    body,
    div,
    h3,
    p,
    a,
    img,
    audio,
    input,
    label,
    button
  } = createTags(SUPPORTED_TAGS);
  function createTags(tagNames) {
    return tagNames.reduce((acc, tagName) => {
      return Object.assign(acc, {
        [tagName]: tag(tagName)
      });
    }, {});
  }
  function tag(tagName) {
    function element(propsOrChildren, childrenOrNone) {
      const [props, children] = Array.isArray(propsOrChildren) ? [void 0, propsOrChildren] : [propsOrChildren, childrenOrNone];
      return elementFactory(props, children);
    }
    ;
    function elementFactory(props, children) {
      const element2 = document.createElement(tagName);
      if (props) {
        let assignProps = function(props2) {
          Object.assign(element2, props2);
          if (props2.class) {
            element2.className = props2.class;
          }
          ;
          if (element2 instanceof HTMLLabelElement && props2.for) {
            element2.htmlFor = props2.for;
          }
          ;
          Object.entries(props2.style ?? {}).forEach(([key, value]) => {
            element2.style[key] = value;
          });
        };
        if (typeof props === "function") {
          const ref2 = computed(props);
          ref2.runAndWatch(assignProps);
        } else {
          assignProps(props);
        }
        ;
        ;
      }
      ;
      if (children) {
        children.forEach((child) => {
          if (typeof child === "string") {
            element2.appendChild(document.createTextNode(child));
          } else {
            element2.appendChild(child);
          }
          ;
        });
      }
      ;
      return element2;
    }
    return element;
  }

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/dev.ts
  mutate(window, { ref, computed, useNot, BaseRef, Ref, ComputedRef });
})();
