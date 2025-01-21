(vovas = { main() {
(() => {
  // src/lodashish.ts
  function find(arr, filter) {
    return arr.find(createPredicate(filter));
  }
  function createPredicate(filter) {
    return function(item) {
      return Object.entries(filter).every(([key, value]) => item[key] === value);
    };
  }
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
  function compact(arr) {
    return arr.filter(Boolean);
  }
  function values(obj) {
    return Object.values(obj);
  }

  // src/utils.ts
  function Undefined() {
    return void 0;
  }
  function EmptyArray() {
    return [];
  }
  function $with(obj, fn) {
    return fn(obj);
  }
  function jsonClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function mutated(obj, partial) {
    mutate(obj, partial);
    return obj;
  }
  var lastCalled = 0;
  function atLeast(milliseconds) {
    const timeToWait = Math.max(0, milliseconds - (Date.now() - lastCalled));
    return new Promise((resolve) => {
      setTimeout(() => {
        lastCalled = Date.now();
        resolve();
      }, timeToWait);
    });
  }
  function $throw(message) {
    throw new Error(message);
  }
  async function uploadTextFile() {
    const input2 = document.createElement("input");
    input2.type = "file";
    input2.click();
    return new Promise((resolve) => {
      input2.onchange = () => {
        const file = input2.files?.[0];
        if (!file) {
          return resolve(void 0);
        }
        ;
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
          input2.remove();
        };
        reader.readAsText(file);
      };
    });
  }
  function isoStringToTimestamp(isoString) {
    return isoString ? new Date(isoString).getTime() : 0;
  }
  function sortByDate(items, dateAccessor = (item) => item.created_at) {
    return items.sort((a2, b2) => isoStringToTimestamp(dateAccessor(a2)) - isoStringToTimestamp(dateAccessor(b2)));
  }
  function debug(arg) {
    if (typeof arg === "function") {
      return function(...args) {
        debugger;
        return arg(...args);
      };
    } else {
      debugger;
      return arg;
    }
    ;
  }
  function doAndReturn(target, fn) {
    fn(target);
    return target;
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

  // src/cropping.ts
  //! Background info: For some unknown reason, Suno doesn't keep the data bout the original clip when you crop it.
  //! To work around this, whenever we find a cropped clip, we find the first clip that:
  //! - Is earlier than the cropped clip
  //! - Has the same genre as the cropped clip
  //! - Has the same image as the cropped clip
  //! This last part is especially tricky because Suno stores the images as URLs, and the URLs are different for the same image. Moreover, even the images themselves are different because they are compressed at different times, and as JPEG is a lossy format, the images are not pixel-perfect.
  //! (Imagine all the pains we have to go through just because someone (Suno team, I'm looking at you) didn't think it was important to keep the data about the original clip when cropping it!)
  async function findCropBaseClipId(croppedClip, clips) {
    for (let clip of clips.slice(clips.findIndex((clip2) => clip2.id === croppedClip.id) + 1)) {
      if (clip !== croppedClip && clip.metadata.tags === croppedClip.metadata.tags && await areImagesEqual(clip.image_url, croppedClip.image_url)) {
        console.warn(`Found potential base clip for cropped clip ${croppedClip.id}: ${clip.id} (this is not guaranteed to be correct)`);
        return clip.id;
      }
      ;
    }
    console.warn(`Could not find a base clip for cropped clip ${croppedClip.id}, the clip will be mistakenly marked as a root clip.`);
  }
  async function loadImage(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const img2 = new Image();
      img2.onload = () => {
        URL.revokeObjectURL(img2.src);
        resolve(img2);
      };
      img2.onerror = reject;
      img2.src = URL.createObjectURL(blob);
    });
  }
  async function areImagesEqual(url1, url2) {
    const img1 = await loadImage(url1);
    const img2 = await loadImage(url2);
    const canvas2 = document.createElement("canvas");
    canvas2.width = img1.width;
    canvas2.height = img1.height;
    const ctx = canvas2.getContext("2d") ?? $throw("Canvas 2D context not supported");
    ctx.drawImage(img1, 0, 0);
    const img1Data = ctx.getImageData(0, 0, img1.width, img1.height);
    ctx.drawImage(img2, 0, 0);
    const img2Data = ctx.getImageData(0, 0, img2.width, img2.height);
    const data1 = img1Data.data;
    const data2 = img2Data.data;
    const len = data1.length;
    let diff = 0;
    for (let i2 = 0; i2 < len; i2 += 4) {
      for (let j = 0; j < 3; j++) {
        diff += Math.abs(data1[i2 + j] - data2[i2 + j]);
      }
    }
    ;
    const avgDiff = diff / (len / 4);
    canvas2.remove();
    return avgDiff < 32;
    //! (This is a very naive implementation; a more sophisticated one would involve comparing the images in the frequency domain, but that's a bit too much for this project)
  }

  // src/resolvable.ts
  var Resolvable = class {
    resolve;
    reject;
    promise;
    constructor() {
      this.promise = new Promise(
        (resolve, reject) => Object.assign(this, { resolve, reject })
      );
    }
  };

  // src/storage.ts
  var dbName = "vovas";
  var storeName = "sunoTools";
  var dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async function dbTransaction(mode) {
    return (await dbPromise).transaction(storeName, mode);
  }
  function transactionCompletionPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
  async function storePromise(mode) {
    return (await dbTransaction(mode)).objectStore(storeName);
  }
  var Storage = class {
    constructor(key, init) {
      this.key = key;
      this.init = init;
    }
    async load() {
      const request = (await storePromise("readonly")).get(this.key);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(
          request.result ?? this.init
        );
        request.onerror = () => reject(request.error);
      });
    }
    async save(data2) {
      const transaction = await dbTransaction("readwrite");
      transaction.objectStore(storeName).put(data2, this.key);
      return transactionCompletionPromise(transaction);
    }
    async clear() {
      const transaction = await dbTransaction("readwrite");
      transaction.objectStore(storeName).delete(this.key);
      return transactionCompletionPromise(transaction);
    }
  };

  // src/types.ts
  var BRAND = Symbol("brand");
  function infer(inferable, value) {
    return isFunction(inferable) ? inferable(value) : inferable;
  }

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
    return isFunction(valueOrGetter) ? computed(valueOrGetter, setter) : isRefs(valueOrGetter) ? new ComputedRef(() => mapValues(valueOrGetter, unref), values(valueOrGetter)) : new WritableRef(valueOrGetter);
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
  var SetterRef = class extends WritableRef {
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
    new ForceGraph(graphContainer).graphData(graphData).onNodeClick(({ ref: ref2, element, watcher }) => {
      console.log(
        ...ref2 ? [ref2["_value"], ref2] : [element ?? watcher]
      );
      mutate(window, { $: ref2 ?? element ?? watcher });
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
    return condition.map((value) => value ? infer(ifYes, value) : infer(ifNo));
  }

  // src/templates/colony/ClipCard.ts
  function ClipCard({ id, image_url, name, tags }) {
    return div({ class: "relative" }, [
      a({ href: `https://suno.com/song/${id}`, target: "_blank" }, [
        img({ src: image_url, style: "opacity: 0.5; width: 200px" }),
        div({ class: "absolute topleft", style: "width: 190px; padding: 5px" }, [
          div([name || "[Untitled]"]),
          div({ class: "smol" }, [
            tags || "(no style)"
          ])
        ])
      ])
    ]);
  }

  // src/templates/colony/css.js
  var colonyCss = '.colony { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;}.colony button {background-color: #444;color: #eee}.colony #sidebar {position: fixed;padding: 10px;top: 0;left: 0;bottom: 0;width: 200px;background-color: #333;color: #eee;display: flex;flex-direction: column;justify-content: space-between;}.colony .f-row {display: flex;flex-direction: row;}.colony .f-col {display: flex;flex-direction: column;}.colony .smol {font-size: 0.8em;color: #aaa;}.colony .relative {position: relative;}.colony .absolute {position: absolute;}.colony .topleft {top: 0;left: 0;}.colony .p-1 {padding: 1rem;};.colony .p-2 {padding: 2rem;}.colony .w-100 {width: 100%;}.colony .h-100 {height: 100%;}.colony .j-between {justify-content: space-between;}.colony .settings > * {margin-top: 5px;}';

  // src/templates/colony/colony.ts
  async function render(ctx, rawData, {
    mode = Undefined()
  }) {
    const fullData = jsonClone(rawData);
    //! because ForceGraph mutates the data
    const in3D = mode?.toLowerCase() === "3d";
    const hideUI = ref(false).named("hideUI");
    const showUI = hideUI.map((hide) => !hide).named("showUI");
    const useNextLinks = ref(true).named("useNextLinks");
    const useDescendantLinks = ref(true).named("useDescendantLinks");
    const filterString = ref("").named("filterString");
    const showNextLinks = ref(false).named("showNextLinks");
    const audioElement = ref().named("audioElement");
    const selectedClip = ref().named("selectedClip");
    selectedClip.watch(
      () => setTimeout(() => {
        audioElement.value?.play();
      }, 0)
    );
    const nodesById = /* @__PURE__ */ new Map();
    function nodeById(id2) {
      return nodesById.get(id2) ?? doAndReturn(
        fullData?.nodes.find((node) => node.id === id2) ?? $throw(`Node with ID ${id2} not found.`),
        (node) => nodesById.set(id2, node)
      );
    }
    ;
    const GraphRenderer = await $import("ForceGraph", `https://unpkg.com/${in3D ? "3d-" : ""}force-graph`);
    window.document.head.appendChild(style([colonyCss]));
    //! because ForceGraph mutates links by including source and target nodes instead of their IDs
    const graphContainer = div();
    const graph = new GraphRenderer(graphContainer).graphData(fullData).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkDirectionalParticles(1).nodeLabel(
      (clip) => div([
        ClipCard(clip),
        div({ class: "smol" }, [
          "Click to play, right-click to open in Suno"
        ])
      ]).outerHTML
    ).onNodeClick(assignTo(selectedClip)).onNodeRightClick(({ id: id2 }) => {
      window.open(`https://suno.com/song/${id2}`);
    });
    if (in3D) {
      graph.linkOpacity((l) => l.isMain ? 1 : 0.2);
    } else {
      graph.linkLineDash((l) => l.isMain ? null : [1, 2]);
    }
    ;
    Object.assign(window, { graph });
    async function redrawGraph() {
      new FinalizationRegistry(() => console.log("Previous graph destroyed, container removed from memory")).register(graph, "");
      graph._destructor();
      container.remove();
      await render(this, rawData, { mode });
    }
    ;
    showNextLinks.watchImmediate((show) => {
      graph.linkVisibility((link2) => {
        return !{
          descendant: true,
          next: !show
        }[link2.kind];
      });
    });
    function id(node) {
      return typeof node === "string" ? node : node.id;
    }
    ;
    function sameId(node1, node2) {
      return id(node1) === id(node2);
    }
    ;
    function sameIdAs(original) {
      return (candidate) => sameId(original, candidate);
    }
    ;
    const graphLastUpdated = ref(Date.now).named("graphLastUpdated");
    const matchingNodes = filterString.map((filter) => {
      const { nodes } = fullData;
      //! Note that we are not watching reusableData, just accessing it here
      if (!filter) return nodes;
      filter = filter.toLowerCase();
      return nodes.filter((node) => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter));
    }).named("matchingNodes");
    matchingNodes.watchImmediate(
      (nodes) => graph.nodeVal((node) => nodes.some((n) => n.id === node.id) ? 3 : node.val)
    );
    const filteredNodes = ref({ filter: filterString, nodes: matchingNodes }).map(({ filter, nodes }) => {
      return filter ? [
        ...nodes,
        ...fullData.nodes?.filter((node) => !nodes.includes(node) && nodes.some((n) => n.rootId === node.rootId)) ?? []
        // (^same root nodes)
      ] : nodes;
    }).named("nodes");
    const linksBetweenFilteredNodes = filteredNodes.map((nodes) => {
      if (!nodes) return [];
      return fullData.links.filter((link2) => nodes.some(sameIdAs(link2.source)) && nodes.some(sameIdAs(link2.target)));
    }).named("linksBetweenFilteredNodes");
    const nextLinks = ref({ nodes: filteredNodes, useNextLinks }).map(({ nodes, useNextLinks: useNextLinks2 }) => {
      if (!nodes || !useNextLinks2)
        return [];
      sortByDate(nodes);
      return nodes.filter((node) => node.rootId === node.id).slice(1).map((node, i2) => ({
        source: nodes[i2].id,
        target: node.id,
        kind: "next",
        color: "#006",
        isMain: false
      }));
    }).named("nextLinks");
    const descendantLinks = ref({ nodes: filteredNodes, useDescendantLinks }).map(({ nodes, useDescendantLinks: useDescendantLinks2 }) => {
      if (!nodes || !useDescendantLinks2)
        return [];
      return compact(nodes.map((node) => {
        const root = nodeById(node.rootId ?? $throw(`Node ${node.id} has no root ID.`));
        return root !== node ? {
          source: root.id,
          target: node.id,
          kind: "descendant",
          isMain: false
        } : null;
      }));
    }).named("descendantLinks");
    const filteredLinks = ref({ linksBetweenFilteredNodes, nextLinks, descendantLinks }).map(
      ({ linksBetweenFilteredNodes: linksBetweenFilteredNodes2, nextLinks: nextLinks2, descendantLinks: descendantLinks2 }) => {
        return [
          ...linksBetweenFilteredNodes2,
          ...nextLinks2,
          ...descendantLinks2
        ];
      }
    ).named("links");
    ref({ nodes: filteredNodes, links: filteredLinks }).named("graphData").watchImmediate((data2) => {
      graph.graphData(data2);
      graphLastUpdated.update();
    });
    setTimeout(() => {
      useNextLinks.set(false);
      useDescendantLinks.set(false);
    }, 2e3);
    //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)
    const container = document.body.appendChild(
      div(
        {
          class: "colony",
          style: "position: fixed; top: 0px; left: 0px; z-index: 100;"
        },
        [
          If(
            showUI,
            div({ style: "flex-direction: column; height: 100vh; width: 100vh; background-color: #000;" }, [
              graphContainer,
              div({ id: "sidebar" }, [
                div({ class: "settings f-col" }, [
                  button({
                    style: "margin-bottom: 5px;",
                    onclick: () => hideUI.set(true)
                  }, [
                    "Close Colony"
                  ]),
                  h3(["Settings"]),
                  div(
                    Labeled(
                      "Attract based on time",
                      Checkbox(useNextLinks)
                    )
                  ),
                  If(useNextLinks, div(
                    Labeled(
                      "Show time-based links",
                      Checkbox(showNextLinks)
                    )
                  )),
                  div(
                    Labeled(
                      "Attract to root clip",
                      Checkbox(useDescendantLinks)
                    )
                  ),
                  div([
                    TextInput(filterString, { placeholder: "Filter by name, style or ID" }),
                    p({ class: "smol" }, [
                      "Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"
                    ])
                  ]),
                  button({ onclick: redrawGraph }, [
                    "Redraw"
                  ]),
                  button({ onclick: () => ctx.renderToFile(mode) }, [
                    "Download"
                  ])
                ]),
                If(selectedClip, (clip) => {
                  return div({ class: "w-100" }, [
                    ClipCard(clip),
                    audioElement.value = audio({ src: clip.audio_url, controls: true, class: "w-100" })
                  ]);
                })
              ])
            ]),
            button({
              style: "position: fixed; top: 0px; left: 0px; padding: 5px; z-index: 100;",
              onclick: () => hideUI.set(false)
            }, [
              "Reopen Colony"
            ])
          )
        ]
      )
    );
  }

  // src/api.ts
  var BASE_URL = "https://studio-api.prod.suno.com/api/";
  function fetcher(pathFactory, ignore404) {
    return async (...args) => {
      const path = pathFactory(...args);
      const response = await fetch(BASE_URL + path, {
        headers: {
          authorization: `Bearer ${await window.Clerk.session.getToken()}`
        }
      });
      if (response.status === 404 && ignore404) {
        console.warn(`Could not find resource at ${path}, returning undefined`);
        return;
      }
      ;
      return await response.json();
    };
  }
  var api = {
    getClips: fetcher((page) => "feed/v2?is_liked=true&page=" + page),
    getClip: fetcher(
      (id) => "clip/" + id,
      true
    )
  };

  // src/scripts/colony.ts
  var SYNTHETIC_LINK_KINDS = ["next", "descendant"];
  var DEFAULT_STATE = {
    rawClips: EmptyArray(),
    lastProcessedPage: -1,
    allPagesProcessed: false,
    links: EmptyArray(),
    allLinksBuilt: false
  };
  var Colony = class {
    constructor(state = DEFAULT_STATE) {
      this.state = state;
      this.loadState();
    }
    reset() {
      this.state = DEFAULT_STATE;
      console.log("Colony reset. Run build() to start building it again.");
    }
    storage = new Storage("colony", DEFAULT_STATE);
    stateLoaded = new Resolvable();
    async loadState(fromFile = false) {
      if (fromFile) {
        const json = await uploadTextFile();
        if (!json) {
          console.log("No file selected, aborting.");
          return;
        }
        ;
        this.state = JSON.parse(json);
      } else {
        this.state = await this.storage.load();
      }
      ;
      this.stateLoaded.resolve();
    }
    async saveState(toFile = false) {
      if (toFile) {
        const json = JSON.stringify(this.state);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a2 = document.createElement("a");
        a2.href = url;
        a2.download = "suno_colony.json";
        a2.click();
        URL.revokeObjectURL(url);
      } else {
        await this.storage.save(this.state);
      }
    }
    async build() {
      try {
        if (!this.state.allPagesProcessed) {
          await this.fetchClips();
        }
        ;
        if (!this.state.allLinksBuilt) {
          await this.buildLinks();
        }
        ;
      } finally {
        await this.saveState();
      }
    }
    async fetchClips() {
      console.log("Fetching liked clips...");
      while (true) {
        await atLeast(1e3);
        //! (to avoid rate limiting)
        const { clips } = await api.getClips(this.state.lastProcessedPage + 1);
        if (!clips.length) {
          this.state.allPagesProcessed = true;
          break;
        }
        ;
        this.state.rawClips.push(...clips);
        this.state.lastProcessedPage++;
        console.log(`Processed page ${this.state.lastProcessedPage}; total clips: ${this.state.rawClips.length}`);
      }
    }
    rawClipsById = {};
    async loadClip(id) {
      await atLeast(1e3);
      //! (to avoid rate limiting)
      console.log(`Clip ${id} not found in cache, loading...`);
      const clip = await api.getClip(id) ?? missingClip(id);
      this.state.rawClips.push(clip);
      return clip;
    }
    getClipByIdSync(id) {
      //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
      return this.rawClipsById[id] ??= this.state.rawClips.find(
        (clip) => isV2AudioFilename(id) ? clip.audio_url.includes(id) : clip.id === id
      );
    }
    async getClipById(id) {
      //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
      if (id.startsWith("m_"))
        id = id.slice(2);
      return this.getClipByIdSync(id) ?? await this.loadClip(id);
    }
    async buildLinks() {
      console.log("Building links...");
      for (let i2 = 0; i2 < this.state.rawClips.length; i2++) {
        const clip = this.state.rawClips[i2];
        if (i2 % 100 === 0) {
          console.log(`Processed ${i2} clips out of ${this.state.rawClips.length}`);
        }
        ;
        const { metadata } = clip;
        const [parentId, kind] = "history" in metadata ? $with(
          metadata.history[0],
          (parent) => typeof parent === "string" ? [parent, "extend"] : parent.infill ? [parent.id, "inpaint"] : [parent.id, "extend"]
        ) : "concat_history" in metadata ? [metadata.concat_history[1].id, "apply"] : "cover_clip_id" in metadata ? [metadata.cover_clip_id, "cover"] : "upsample_clip_id" in metadata ? [metadata.upsample_clip_id, "remaster"] : "type" in metadata && metadata.type === "edit_crop" ? await findCropBaseClipId(clip, this.state.rawClips).then(
          (id) => id ? [id, "crop"] : [void 0, void 0]
        ) : [void 0, void 0];
        if (parentId) {
          this.state.links.push([
            (await this.getClipById(parentId)).id,
            //! (Because the actual clip ID might be different from the one in the history)
            clip.id,
            kind
          ]);
        }
      }
      ;
      this.state.allLinksBuilt = true;
      console.log(`Built ${this.state.links.length} links.`);
      console.log("Colony built. Run `await vovas.colony.render()` to view it!");
    }
    _linkedClips;
    get linkedClips() {
      return this._linkedClips ??= this.getLinkedClips();
    }
    getLinkedClips() {
      const linkedClips = this.state.links.reduce(
        (linkedClips2, [parentId, childId, kind]) => {
          const parent = find(linkedClips2, { id: parentId }) ?? $throw(`Could not find parent for link ${parentId} -> ${childId}.`);
          const child = find(linkedClips2, { id: childId }) ?? $throw(`Could not find child for link ${parentId} -> ${childId}.`);
          if (child.parent) {
            throw new Error(`Child ${childId} already has a parent: ${child.parent.clip.id}`);
          }
          ;
          child.parent = { kind, clip: parent };
          (parent.children ??= []).push({ kind, clip: child });
          return linkedClips2;
        },
        jsonClone(this.state.rawClips)
      );
      for (let rootClip of linkedClips.filter(({ parent }) => !parent)) {
        setRoot(rootClip, rootClip);
      }
      ;
      return linkedClips;
      function setRoot(clip, root) {
        Object.assign(clip, { root });
        for (const { clip: child } of clip.children ?? []) {
          setRoot(child, root);
        }
        ;
      }
      ;
    }
    _rootClips;
    get rootClips() {
      return this._rootClips ??= this.getRootClips();
    }
    getRootClips() {
      const rootClips = this.linkedClips.filter(({ parent }) => !parent);
      return sortByDate(rootClips);
    }
    get sortedClips() {
      /*!
      - Start with the oldest root clip.
      - If the current clip has children, recurse for each child.
      - In the end, reverse everything.
      */
      const orderedClips = [];
      const { rootClips } = this;
      for (const rootClip of rootClips) {
        processClip(rootClip);
      }
      ;
      return orderedClips.reverse();
      function processClip(clip) {
        orderedClips.push(clip);
        const { children } = clip;
        if (children) {
          for (const { clip: clip2 } of sortByDate(children, ({ clip: clip3 }) => clip3.created_at)) {
            processClip(clip2);
          }
          ;
        }
        ;
      }
      ;
    }
    get syntheticLinks() {
      const syntheticLinks = [];
      //! (Moved to the graph renderer)
      return syntheticLinks;
    }
    getTotalDescendants(clipId) {
      const clip = find(this.linkedClips, { id: clipId }) ?? $throw(`Clip ${clipId} not found.`);
      return clip.totalDescendants ??= 1 + (clip.children?.reduce((sum, { clip: { id: childId } }) => sum + this.getTotalDescendants(childId), 0) ?? 0);
    }
    _graphData = Undefined();
    getGraphData() {
      const nodes = this.sortedClips.map(({ id, title: name, metadata: { tags }, created_at, children, audio_url, image_url, root }) => ({
        id,
        name: name || tags || created_at || id,
        created_at,
        audio_url,
        image_url,
        tags,
        rootId: root?.id,
        // val: Math.log10(this.getTotalDescendants(id) + 1),
        val: id === root?.id && children?.length ? 2 : children?.length ? 1 : 0.5
      }));
      const formatLink = ([source2, target, kind]) => ({
        source: source2,
        target,
        kind,
        color: kind === "next" ? "#006" : void 0,
        //! (To make time-based links less prominent on a dark background)
        isMain: !SYNTHETIC_LINK_KINDS.includes(kind) && this.getTotalDescendants(target) > 1
      });
      const result = {
        nodes,
        links: [
          ...this.syntheticLinks,
          ...this.state.links
        ].map(formatLink)
      };
      return result;
    }
    get graphData() {
      return this._graphData ??= this.getGraphData();
    }
    getHtml(mode) {
      console.log("Rendering your colony, give it a few seconds...");
      return `<script>(vovas = {${window.vovas.main.toString()}}).main();vovas.colony.render(...${JSON.stringify([mode, this.graphData])})<\/script>`;
    }
    async render(mode, data2) {
      console.log("Rendering your colony, give it a few seconds...");
      this._graphData ??= data2;
      await render(this, this.graphData, { mode });
    }
    renderToFile(...params) {
      const html2 = this.getHtml(...params);
      const blob = new Blob([html2], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = "suno_colony.html";
      a2.click();
      URL.revokeObjectURL(url);
    }
  };
  var colony = new Colony();
  colony.stateLoaded.promise.then(async () => {
    console.log("Welcome to Vova\u2019s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it\u2019ll be worth it!");
    const { state: { allPagesProcessed, allLinksBuilt } } = colony;
    if (!allPagesProcessed || !allLinksBuilt) {
      console.log("Run `await vovas.colony.build()` to start or continue building your colony!");
    } else {
      console.log("Your colony is built, rendering!");
      await colony.render();
    }
  });
  function isV2AudioFilename(id) {
    return id.match(/_\d+$/);
  }
  function missingClip(id) {
    console.warn(`Clip ${id} not found, creating a missing clip.`);
    return {
      isMissing: true,
      id,
      title: "*Clip not found*",
      created_at: null,
      audio_url: `https://cdn1.suno.ai/${id}.mp3`,
      //! (This is not guaranteed to work, but who can blame us for trying?)
      image_url: "",
      metadata: { duration: 0, tags: "" }
    };
  }
  mutate(window.vovas, { Colony, colony, debug });
  debug();
})();
}}).main();
