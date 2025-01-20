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
  function debug() {
    debugger;
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
    setter(setter = (value) => this._set(value)) {
      return new SetterRef(this, setter);
    }
  };
  var MappedRef = class extends Ref {
    constructor(source2, mapper) {
      super(mapper(source2.value));
      this.source = source2;
      this.mapper = mapper;
      source2.watch(this.update);
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
      return this.map(forward).setter((value) => this.set(backward(value)));
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
  var currentComputedTracker = void 0;
  var ComputedRef = class extends Ref {
    constructor(getter) {
      super(void 0);
      this.getter = getter;
      this.track();
    }
    _dependencies = /* @__PURE__ */ new Set();
    track = () => {
      if (currentComputedTracker) {
        throw new SmorkError(
          "Tried to compute a ref while another one is already being computed \u2014 did you nest a computed ref in another ref's getter function?"
        );
      }
      ;
      this._dependencies.forEach((ref2) => ref2.unwatch(this.track));
      this._dependencies = /* @__PURE__ */ new Set();
      try {
        currentComputedTracker = (ref2) => {
          ref2.watch(this.track);
          this._dependencies.add(ref2);
        };
        this._set(this.getter());
      } finally {
        currentComputedTracker = void 0;
      }
    };
    get dependencies() {
      return this._dependencies;
    }
  };
  function computed(getter, setter) {
    return $with(
      new ComputedRef(getter),
      (computedRef) => setter ? computedRef.setter(setter) : computedRef
    );
  }
  function unref(refable) {
    return refable instanceof Ref ? refable.value : refable;
  }
  function toref(refable) {
    return refable instanceof Ref ? refable : new Ref(refable);
  }

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
    const in3D = mode?.toLowerCase() === "3d";
    const hideUI = ref(false);
    const showUI = hideUI.map((hide) => !hide);
    const graphContainer = ref();
    graphContainer.onceDefined(createGraph);
    const graph = ref();
    const data2 = graph.map((graph2) => graph2?.graphData());
    const useNextLinks = ref(true);
    const useDescendantLinks = ref(true);
    const filterString = ref("");
    const showNextLinks = ref(false);
    const audioElement = ref();
    const selectedClip = ref();
    selectedClip.onChange(
      () => setTimeout(() => {
        audioElement.value?.play();
      }, 0)
    );
    const GraphRenderer = await importScript(window, "ForceGraph", `https://unpkg.com/${in3D ? "3d-" : ""}force-graph`);
    window.document.head.appendChild(style([colonyCss]));
    //! because ForceGraph mutates links by including source and target nodes instead of their IDs
    const graphData = jsonClone(rawData);
    //! again, because ForceGraph mutates the data
    function createGraph(graphContainer2) {
      graph.value = new GraphRenderer(graphContainer2).graphData(graphData).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(visibilityChecker).linkDirectionalParticles(1).nodeLabel(
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
        graph.value.linkOpacity((l) => l.isMain ? 1 : 0.2);
      } else {
        graph.value.linkLineDash((l) => l.isMain ? null : [1, 2]);
      }
      ;
    }
    ;
    async function redrawGraph() {
      new FinalizationRegistry(() => console.log("Previous graph destroyed, container removed from memory")).register(graph, "");
      graph.value?._destructor();
      container.remove();
      await render(this, rawData, { mode });
    }
    ;
    function visibilityChecker(link2) {
      return !{
        descendant: true,
        next: !showNextLinks.value
      }[link2.kind];
    }
    ;
    function applyLinkFilter(kind, useLinks) {
      if (!data2.value || !graph.value)
        return;
      let { nodes, links } = data2.value;
      if (!useLinks) {
        links = links.filter((l) => l.kind !== kind);
      } else {
        links.push(...data2.value.links.filter((l) => l.kind === kind));
      }
      if (kind === "next") {
        links = links.filter((l) => l.kind !== "next");
        if (useLinks) {
          sortByDate(nodes);
          for (let i2 = 1; i2 < nodes.length; i2++) {
            const source2 = nodes[i2 - 1];
            const target = nodes[i2];
            links.push({
              source: source2.id,
              target: target.id,
              kind: "next",
              color: "#006",
              isMain: false
            });
          }
          ;
        }
      }
      ;
      graph.value.graphData({ nodes, links });
    }
    ;
    useNextLinks.watchImmediate((useLinks) => applyLinkFilter("next", useLinks));
    useDescendantLinks.watchImmediate((useLinks) => applyLinkFilter("descendant", useLinks));
    showNextLinks.watchImmediate(() => {
      graph.value?.linkVisibility(visibilityChecker);
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
    filterString.watchImmediate((rawFilter) => {
      if (!data2.value || !graph.value)
        return;
      const filter = rawFilter?.toLowerCase();
      const matchingNodes = filter ? data2.value.nodes.filter((node) => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter)) : data2.value.nodes;
      const existing = graph.value.graphData();
      const nodes = [
        ...matchingNodes.map((node) => existing.nodes.find(sameIdAs(node)) ?? node),
        ...filter ? data2.value.nodes.filter((node) => matchingNodes.some((n) => n.rootId === node.rootId && n.id !== node.id)) : []
      ].map((node) => existing.nodes.find((n) => n.id === node.id) ?? node);
      const links = data2.value.links.filter((link2) => nodes.some(sameIdAs(link2.source)) && nodes.some(sameIdAs(link2.target))).map(({ source: source2, target, ...rest }) => ({ source: id(source2), target: id(target), ...rest })).map((link2) => existing.links.find((l) => sameId(link2.source, l.source) && sameId(link2.target, l.target)) ?? link2);
      graph.value.graphData({ nodes, links });
      if (filter)
        graph.value.nodeVal((node) => matchingNodes.some((n) => n.id === node.id) ? 3 : node.val);
      else
        graph.value.nodeVal("val");
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
              graphContainer.value = div(),
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
      const { rootClips } = this;
      let currentParent = rootClips[0];
      //! Link every clip with children to its root, for better visualization.
      for (const clip of this.linkedClips.filter(({ children }) => children?.length)) {
        syntheticLinks.push([(clip.root ?? $throw(`Clip ${clip.id} has no root.`)).id, clip.id, "descendant"]);
      }
      ;
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
})();
}}).main();
