(vovas = { main() {
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lodashish.ts
  var lastId = 0;
  function uniqueId(prefix = "") {
    return `${prefix}${++lastId}`;
  }
  function mapValues(obj, mapper) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, mapper(value, key)])
    );
  }
  function forEach(obj, callback) {
    return mapValues(obj, callback);
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
    return isFunction(valueOrGetter) ? computed(valueOrGetter, setter) : new WritableRef(valueOrGetter);
  }
  var Ref = class {
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
    map(nestableGetter) {
      const mapped = new MappedRef(this, nestableGetter);
      if (isFunction(mapped.value)) {
        this.unwatch(mapped.update);
        return (...args) => new MappedRef(
          this,
          (value) => nestableGetter(value)(...args)
        );
      }
      ;
      return mapped;
    }
    // if<U>(compareTo: T, ifEquals: Inferable<U, T>, ifNot: Inferable<U, T>): MappedRef<T, U>;
    // if<G extends T, U, V>(typeguard: (value: T) => value is G, ifMatches: Inferable<U, G>, ifNot: (value: Exclude<T, G>) => V): MappedRef<T, U | V>;
    // if<U>(predicate: (value: T) => boolean, ifHolds: Inferable<U>, ifNot: Inferable<U>): MappedRef<T, U>;
    // if<U>(comparator: T | ((value: T) => any) | ((value: T) => boolean), ifYes: (Inferable<U, T>), ifNot: Inferable<U, T>) {
    //   return this.map(value => 
    //     (
    //       isFunction(comparator) ? comparator : isEqual(comparator)
    //     )(value) 
    //       ? infer(ifYes, value) 
    //       : infer(ifNot, value)
    //   );
    // };
    merge(mergee) {
      return mergee ? computed(() => ({
        ...this.value,
        ...unref(mergee)
      })) : this;
    }
    uses(methods) {
      return assign(this, mapValues(methods, this.map));
    }
    onceDefined(callback) {
      const wrapped = (value) => {
        if (value) {
          this.unwatch(wrapped);
          callback(value);
        }
        ;
      };
      this.watchImmediate(wrapped);
    }
  };
  var MappedRef = class extends Ref {
    constructor(dependency, mapper) {
      var __super = (...args) => {
        super(...args);
        this.dependency = dependency;
        this.mapper = mapper;
        return this;
      };
      if (dependency) {
        __super(mapper(dependency.value));
        dependency.watch(this.update);
      }
      ;
    }
    update = (value) => this._set(this.mapper(value));
  };
  var WritableRef = class extends Ref {
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
  var ComputedRef = class extends WritableRef {
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
  var WritableComputedRef = class extends WritableRef {
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
  function unref(refable) {
    return refable instanceof Ref ? refable.value : refable;
  }
  function toref(refable) {
    return refable instanceof Ref ? refable : new Ref(refable);
  }

  // src/utils.ts
  function Undefined() {
    return void 0;
  }
  function $with(obj, fn) {
    return fn(obj);
  }
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/smork/dom.ts
  var dom_exports = {};
  __export(dom_exports, {
    $object: () => $object,
    $var: () => $var,
    Checkbox: () => Checkbox,
    If: () => If,
    Labeled: () => Labeled,
    TextInput: () => TextInput,
    a: () => a,
    abbr: () => abbr,
    address: () => address,
    area: () => area,
    article: () => article,
    aside: () => aside,
    audio: () => audio,
    b: () => b,
    base: () => base,
    bdi: () => bdi,
    bdo: () => bdo,
    blockquote: () => blockquote,
    body: () => body,
    br: () => br,
    button: () => button,
    canvas: () => canvas,
    caption: () => caption,
    cite: () => cite,
    code: () => code,
    col: () => col,
    colgroup: () => colgroup,
    data: () => data,
    datalist: () => datalist,
    dd: () => dd,
    del: () => del,
    details: () => details,
    dfn: () => dfn,
    dialog: () => dialog,
    div: () => div,
    dl: () => dl,
    dt: () => dt,
    em: () => em,
    embed: () => embed,
    fieldset: () => fieldset,
    figcaption: () => figcaption,
    figure: () => figure,
    footer: () => footer,
    form: () => form,
    h1: () => h1,
    h2: () => h2,
    h3: () => h3,
    h4: () => h4,
    h5: () => h5,
    h6: () => h6,
    head: () => head,
    header: () => header,
    hgroup: () => hgroup,
    hr: () => hr,
    html: () => html,
    i: () => i,
    iframe: () => iframe,
    img: () => img,
    importScript: () => importScript,
    input: () => input,
    ins: () => ins,
    kbd: () => kbd,
    label: () => label,
    legend: () => legend,
    li: () => li,
    link: () => link,
    main: () => main,
    map: () => map,
    mark: () => mark,
    menu: () => menu,
    meta: () => meta,
    meter: () => meter,
    nav: () => nav,
    noscript: () => noscript,
    ol: () => ol,
    optgroup: () => optgroup,
    option: () => option,
    output: () => output,
    p: () => p,
    picture: () => picture,
    pre: () => pre,
    progress: () => progress,
    q: () => q,
    rp: () => rp,
    rt: () => rt,
    ruby: () => ruby,
    s: () => s,
    samp: () => samp,
    script: () => script,
    search: () => search,
    section: () => section,
    select: () => select,
    slot: () => slot,
    small: () => small,
    source: () => source,
    span: () => span,
    strong: () => strong,
    style: () => style,
    sub: () => sub,
    summary: () => summary,
    sup: () => sup,
    table: () => table,
    tag: () => tag,
    tbody: () => tbody,
    td: () => td,
    template: () => template,
    textarea: () => textarea,
    tfoot: () => tfoot,
    th: () => th,
    thead: () => thead,
    time: () => time,
    title: () => title,
    tr: () => tr,
    track: () => track,
    u: () => u,
    ul: () => ul,
    video: () => video,
    wbr: () => wbr
  });

  // src/smork/types.ts
  var TAGS = ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu", "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "search", "section", "select", "slot", "small", "source", "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr"];

  // src/smork/dom.ts
  function tag(tagName) {
    function factory(propsOrChildren, childrenOrNone) {
      const [props, children] = Array.isArray(propsOrChildren) ? [void 0, propsOrChildren] : [propsOrChildren, childrenOrNone];
      return verboseFactory(props, children);
    }
    return factory;
    function verboseFactory(props, children) {
      const element = document.createElement(tagName);
      props && forEach(
        props,
        (value, key) => {
          typeof value === "function" ? element[key] = value : $with(value, (refable) => {
            update(unref(refable));
            toref(refable).watch(update);
            function update(value2) {
              typeof value2 === "boolean" ? value2 ? element.setAttribute(key, "") : element.removeAttribute(key) : element.setAttribute(key, String(value2));
            }
            ;
          });
        }
      );
      children && children.forEach((child) => {
        let currentNode = Undefined();
        const place = (node) => {
          const rawNode = typeof node === "string" ? document.createTextNode(node) : node instanceof HTMLElement ? node : document.createComment("");
          currentNode ? currentNode.replaceWith(rawNode) : element.appendChild(rawNode);
          currentNode = rawNode;
        };
        child instanceof Ref ? child.watchImmediate(place) : place(child);
      });
      return element;
    }
    ;
  }
  var {
    a,
    abbr,
    address,
    area,
    article,
    aside,
    audio,
    b,
    base,
    bdi,
    bdo,
    blockquote,
    body,
    br,
    button,
    canvas,
    caption,
    cite,
    code,
    col,
    colgroup,
    data,
    datalist,
    dd,
    del,
    details,
    dfn,
    dialog,
    div,
    dl,
    dt,
    em,
    embed,
    fieldset,
    figcaption,
    figure,
    footer,
    form,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    head,
    header,
    hgroup,
    hr,
    html,
    i,
    iframe,
    img,
    input,
    ins,
    kbd,
    label,
    legend,
    li,
    link,
    main,
    map,
    mark,
    menu,
    meta,
    meter,
    nav,
    noscript,
    object: $object,
    ol,
    optgroup,
    option,
    output,
    p,
    picture,
    pre,
    progress,
    q,
    rp,
    rt,
    ruby,
    s,
    samp,
    script,
    search,
    section,
    select,
    slot,
    small,
    source,
    span,
    strong,
    style,
    sub,
    summary,
    sup,
    table,
    tbody,
    td,
    template,
    textarea,
    tfoot,
    th,
    thead,
    time,
    title,
    tr,
    track,
    u,
    ul,
    var: $var,
    video,
    wbr
  } = TAGS.reduce((tags, tagName) => {
    tags[tagName] = tag(tagName);
    return tags;
  }, {});
  function Checkbox(model, props) {
    return tag("input")({
      ...props,
      type: "checkbox",
      checked: model,
      onchange: () => model.set(!model.value)
    });
  }
  function TextInput(model, props) {
    return tag("input")({
      ...props,
      type: "text",
      value: model,
      onkeyup: ({ key, target }) => {
        key === "Enter" && target instanceof HTMLInputElement && model.set(target.value);
      }
    });
  }
  function Labeled(labelText, element) {
    element.id ||= uniqueId("smork-input-");
    const output2 = [
      label({ for: element.id }, [labelText]),
      element
    ];
    if (element.type === "checkbox") {
      output2.reverse();
    }
    ;
    return output2;
  }
  async function importScript(win, windowKey, url) {
    const script2 = win.document.createElement("script");
    script2.type = "text/javascript";
    script2.src = url;
    win.document.head.appendChild(script2);
    return new Promise((resolve) => {
      script2.onload = () => {
        resolve(win[windowKey]);
      };
    });
  }
  function If(condition, ifYes, ifNo = Undefined()) {
    return condition.map((value) => value ? ifYes : ifNo);
  }

  // src/scripts/dev.ts
  mutate(window, { ref, computed, useNot, Ref, WritableRef, ComputedRef, WritableComputedRef, ...dom_exports });
})();
}}).main();
