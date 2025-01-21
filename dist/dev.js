(vovas = { main() {
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/lodashish.ts
  var lastIdByPrefix = {};
  function uniqueId(prefix = "") {
    lastIdByPrefix[prefix] ??= 0;
    return `${prefix}${++lastIdByPrefix[prefix]}`;
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
  function identity(value) {
    return value;
  }
  function assign(obj, partial) {
    return Object.assign(obj, partial);
  }
  function values(obj) {
    return Object.values(obj);
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
  function mutated(obj, partial) {
    mutate(obj, partial);
    return obj;
  }
  function $throw(message) {
    throw new Error(message);
  }
  function getOrSet(map2, key, defaultValue) {
    const value = map2.get(key);
    if (value !== void 0) {
      return value;
    }
    ;
    map2.set(key, defaultValue);
    return defaultValue;
  }

  // src/smork/dom.ts
  var dom_exports = {};
  __export(dom_exports, {
    $import: () => $import,
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
      DEV_MODE && allElements.add(element);
      props && forEach(
        props,
        (value, key) => {
          typeof value === "function" ? element[key] = value : $with(value, (refable) => {
            update(unref(refable));
            toref(refable).watch(update);
            DEV_MODE && refable instanceof Ref && getOrSet(refToElementLinks, refable, /* @__PURE__ */ new Set()).add(element);
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
        DEV_MODE && child instanceof Ref && getOrSet(refToElementLinks, child, /* @__PURE__ */ new Set()).add(element);
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
  async function $import(windowKey, src) {
    if (window[windowKey]) {
      return window[windowKey];
    }
    ;
    return new Promise((resolve) => {
      document.head.appendChild(script({ src, onload: () => resolve(window[windowKey]) }));
    });
  }
  function If(condition, ifYes, ifNo = Undefined()) {
    return condition.map((value) => value ? ifYes : ifNo);
  }

  // src/smork/devTools.ts
  var DEV_MODE = true;
  var allRefs = /* @__PURE__ */ new Set();
  var allElements = /* @__PURE__ */ new Set();
  var refToElementLinks = /* @__PURE__ */ new Map();
  async function devTools() {
    const ForceGraph = await $import("ForceGraph", `https://unpkg.com/force-graph`);
    let container;
    let graphContainer;
    const minimized = ref(false).named("minimized");
    const size = minimized.map((minimized2) => minimized2 ? "10" : "70");
    document.body.appendChild(
      container = div({ style: "position: fixed; top: 0; right: 0; z-index: 300; background: #eee; padding: 1em;" }, [
        div({ style: "position: relative;" }, [
          graphContainer = div({ style: size.map((size2) => `height: ${size2}vh; width: ${size2}vw; overflow: auto`) }),
          button({
            style: "position: absolute; top: 0; left: 0; color: black",
            onclick: () => container.remove()
          }, ["X"]),
          button({
            style: "position: absolute; top: 0; right: 0; color: black",
            onclick: () => minimized.set(!minimized.value)
          }, [
            If(minimized, "\u2199", "\u2197")
          ])
        ])
      ])
    );
    const refs = [...allRefs];
    const refNodes = refs.map((ref2) => ({
      id: ref2.id,
      ref: ref2,
      class: ref2.constructor.name,
      name: `${ref2.name ?? ref2.id} (${ref2.constructor.name}) = ${Array.isArray(ref2.value) ? `${ref2.value.length} \u2715 ${ref2.value[0]?.constructor.name}` : ref2.value?.toString()}`,
      val: 3
    }));
    const refLinks = refNodes.map(({ id: source2, ref: { targets } }) => [...targets].map(({ id: target }) => ({ source: source2, target }))).flat();
    const watcherNodes = refs.map(({ watchers }) => [...watchers].map((watcher) => ({
      id: uniqueId("watcher-"),
      watcher,
      class: "watcher",
      name: `${watcher.toString()}`
    }))).flat();
    const idByWatcher = new Map(watcherNodes.map(({ watcher, id }) => [watcher, id]));
    const watcherLinks = refs.map(({ id: source2, watchers }) => [...watchers].map((watcher) => ({
      source: source2,
      target: idByWatcher.get(watcher) ?? $throw(`Watcher ${watcher} has no ID.`)
    })).flat()).flat();
    function ElementNode(element) {
      return {
        id: uniqueId("el-"),
        element,
        class: element.constructor.name,
        name: `${element.tagName}#${element.id || ""}.${element.className}`,
        val: element.querySelectorAll("*").length
      };
    }
    ;
    const elementNodes = [...allElements].map(ElementNode);
    const idByElement = /* @__PURE__ */ new Map();
    const getElementId = (element) => {
      const elementId = (elementNodes.find(({ element: e }) => e === element) ?? (() => {
        const newElementNode = ElementNode(element);
        elementNodes.push(newElementNode);
        return newElementNode;
      })()).id;
      return getOrSet(idByElement, element, elementId);
    };
    const elementLinks = [
      ...[...refToElementLinks].map(([{ id: source2 }, elements]) => [...elements].map(
        (element) => ({ source: source2, target: getElementId(element) })
      )).flat(),
      ...[...allElements].map((element) => {
        const children = [...element.children].filter((child) => child instanceof HTMLElement);
        return children.map((child) => ({ source: getElementId(element), target: getElementId(child) }));
      }).flat()
    ];
    const nodes = [...refNodes, ...elementNodes, ...watcherNodes];
    const links = [...refLinks, ...elementLinks, ...watcherLinks];
    const graphData = { nodes, links };
    const getColorForIndex = (index) => "#" + (index * 1234567 % Math.pow(2, 24)).toString(16).padStart(6, "0");
    let maxIndex = 0;
    const indexByString = /* @__PURE__ */ new Map();
    const getColorForString = (string) => getColorForIndex(getOrSet(indexByString, string, ++maxIndex));
    new ForceGraph(graphContainer).graphData(graphData).onNodeClick(({ ref: ref2, element }) => {
      console.log(
        ...ref2 ? [ref2, ref2["_value"]] : [element]
      );
      mutate(window, { $: ref2 ?? element });
    }).nodeAutoColorBy("class").nodeCanvasObjectMode(({ ref: ref2, element }) => ref2 ? "after" : element && "replace").nodeCanvasObject(({ ref: ref2, element, x, y, val }, ctx) => {
      if (ref2?.name && x && y) {
        ctx.font = "10px Arial";
        ctx.fillText(ref2.name, x + 10, y);
      }
      if (element && x && y) {
        ctx.beginPath();
        ctx.arc(x, y, Math.sqrt(Number(val) + 1), 0, 2 * Math.PI, false);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = getColorForString(element.tagName);
        ctx.stroke();
      }
      ;
    }).linkLineDash(({ target }) => typeof target === "object" && target.element ? [4, 2] : null).linkDirectionalParticles(1);
    const result = { refNodes, elementNodes, refLinks, watcherLinks, elementLinks };
    mutate(window.smork, result);
    console.log(result);
  }
  Object.assign(window, { smork: { devTools, allRefs, allElements, refToElementLinks } });

  // src/smork/refs.ts
  //! Smork, the smol framework
  var SmorkError = class extends Error {
    constructor(message) {
      super(`smork: ${message}`);
    }
  };
  function isRefs(value) {
    return value && typeof value === "object" && values(value).every((value2) => value2 instanceof Ref);
  }
  function ref(valueOrGetter, setter) {
    return isFunction(valueOrGetter) ? computed(valueOrGetter, setter) : isRefs(valueOrGetter) ? new ComputedRef(() => mapValues(valueOrGetter, unref), values(valueOrGetter)) : new WritableRef2(valueOrGetter);
  }
  var NotApplicable = Symbol("NotApplicable");
  var Ref = class {
    constructor(_value) {
      this._value = _value;
      DEV_MODE && allRefs.add(this);
    }
    watchers = /* @__PURE__ */ new Set();
    activeWatchers = /* @__PURE__ */ new WeakSet();
    targets = /* @__PURE__ */ new Set();
    id = uniqueId("ref-");
    name = Undefined();
    named(name) {
      return mutated(this, { name });
    }
    get() {
      currentComputedTracker?.(this);
      return this._value;
    }
    _set(value) {
      const { _value: oldValue } = this;
      if (value !== oldValue) {
        this._value = value;
        this.tarnishTargets();
        try {
          for (const watcher of this.watchers) {
            if (this.activeWatchers.has(watcher)) {
              console.warn("smork: watcher is already active \u2014 perhaps a circular dependency \u2014 exiting watch to prevent infinite loop");
            }
            ;
            this.activeWatchers.add(watcher);
            watcher(value, oldValue);
          }
          ;
        } finally {
          this.activeWatchers = /* @__PURE__ */ new WeakSet();
        }
        ;
      }
      ;
    }
    tarnishTargets() {
      this.targets.forEach((target) => target.tarnish());
    }
    watchImmediate(watcher) {
      watcher(this.value, NotApplicable);
      this.watch(watcher);
    }
    watch(watcher) {
      this.watchers.add(watcher);
    }
    unwatch(watcher) {
      this.watchers.delete(watcher);
    }
    get value() {
      return this.get();
    }
    map(nestableGetter) {
      const mapped = new MappedRef(this, nestableGetter);
      if (isFunction(mapped.value)) {
        this.targets.delete(mapped);
        mapped.sources.clear();
        return (...args) => new MappedRef(
          this,
          (value) => nestableGetter(value)(...args)
        );
      }
      ;
      return mapped;
    }
    mapDefined(callback) {
      return this.map((value) => value !== void 0 ? callback(value) : void 0);
    }
    uses(methods) {
      return assign(this, mapValues(methods, this.map));
    }
    setter(setter = (value) => this._set(value)) {
      return new SetterRef(this, setter);
    }
  };
  var currentComputedTracker = void 0;
  var ComputedRef = class extends Ref {
    constructor(getter, predefinedSources = Undefined()) {
      super(void 0);
      this.getter = getter;
      this.sources = new Set(predefinedSources);
      if (this.sourcesPredefined = !!predefinedSources) {
        predefinedSources.forEach((ref2) => ref2.targets.add(this));
      }
      ;
    }
    sources;
    sourcesPredefined = false;
    dirty = true;
    /**
     * Marks the current ref and its targets as dirty.
     * 
     * - If the ref is already dirty, it does nothing.
     * - If there are watchers on the current object, it triggers the recalculation right away to notify them.
     * - Otherwise, it marks the targets as dirty but doesn't recalculate them or itself until they are accessed or watched.
     */
    tarnish() {
      if (this.dirty) return;
      this.dirty = true;
      if (this.watchers.size) {
        this.recalculate();
      } else {
        this.tarnishTargets();
      }
      ;
    }
    /**
     * Retrieves the value, recalculating it if necessary.
     * 
     * If the value is marked as dirty, calls the recalculate method.
     * Otherwise, returns the value cached during the last recalculation.
     * 
     * (Newly created computed refs are dirty by definition, so they will recalculate on the first access.)
     */
    get() {
      if (this.dirty) {
        this.recalculate();
      }
      ;
      return super.get();
    }
    /**
     * Recalculates the current state of the ref.
     * 
     * - If `sourcesPredefined` is true, it simply calls the `update` method, updating the value according to the getter.
     * - Otherwise, it clears the sources set, then recalculates the getter while tracking the sources.
     * 
     * In both cases, it updates the cached value and marks the ref as clean.
     */
    recalculate() {
      if (this.sourcesPredefined) return this.update();
      if (currentComputedTracker) {
        throw new SmorkError(
          "Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?"
        );
      }
      ;
      this.sources.forEach((ref2) => ref2.targets.delete(this));
      this.sources.clear();
      try {
        currentComputedTracker = (ref2) => {
          this.sources.add(ref2);
          ref2.targets.add(this);
        };
        this.update();
      } finally {
        currentComputedTracker = void 0;
      }
    }
    /**
     * Updates the cached value according to the getter and marks the ref as clean.
     */
    update = () => {
      this._set(this.getter());
      this.dirty = false;
    };
  };
  function computed(getter, setter) {
    return $with(
      new ComputedRef(getter),
      (computedRef) => setter ? computedRef.setter(setter) : computedRef
    );
  }
  var MappedRef = class extends ComputedRef {
    constructor(source2, mapper) {
      super(() => mapper(source2.value), [source2]);
      this.source = source2;
    }
  };
  var WritableRef2 = class extends Ref {
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
      return this.map(forward).setter((value) => this.set(backward(value)));
    }
    clone() {
      return new CloneRef(this);
    }
  };
  var CloneRef = class extends MappedRef {
    constructor(source2) {
      super(source2, identity);
      this.source = source2;
    }
  };
  var SetterRef = class extends WritableRef2 {
    constructor(source2, setter, allowMismatch = false) {
      super(source2.value);
      this.source = source2;
      this.allowMismatch = allowMismatch;
      super.watch(assignTo(this));
    }
    set(value) {
      super.set(value);
      if (!this.allowMismatch && this.value !== value) {
        throw new SmorkError("Setter did not update the value. If you want to allow this, set the allowMismatch property to true.");
      }
      ;
    }
  };
  function assignTo(ref2) {
    return (value) => {
      ref2.set(value);
    };
  }
  function unref(refable) {
    return refable instanceof Ref ? refable.value : refable;
  }
  function toref(refable) {
    return refable instanceof Ref ? refable : new Ref(refable);
  }

  // src/scripts/dev.ts
  mutate(window, { ref, computed, Ref, WritableRef: WritableRef2, ComputedRef, SetterRef, ...dom_exports });
})();
}}).main();
