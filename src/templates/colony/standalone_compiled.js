export const render_compiled = () => 
(() => {
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
  function mapKeys(obj, mapper) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [mapper(key, value), value])
    );
  }
  function isFunction(value) {
    return typeof value === "function";
  }

  // src/smork/refs.ts
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
  function runAndWatch(refable, callback) {
    refResolver(refable)(
      (ref2) => ref2.watchImmediate(callback),
      (getter) => ref(getter).watchImmediate(callback),
      callback
    );
  }

  // src/utils.ts
  function isoStringToTimestamp(isoString) {
    return isoString ? new Date(isoString).getTime() : 0;
  }
  function sortByDate(items, dateAccessor = (item) => item.created_at) {
    return items.sort((a2, b) => isoStringToTimestamp(dateAccessor(a2)) - isoStringToTimestamp(dateAccessor(b)));
  }
  function renameKeys(record, keyMap) {
    return mapKeys(record, (key) => keyMap[key] ?? key);
  }

  // src/smork/rendering.ts
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
  var tags = createTags(SUPPORTED_TAGS);
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
  } = tags;
  function createTags(tagNames) {
    return tagNames.reduce((acc, tagName) => {
      return Object.assign(acc, {
        [tagName]: createTag(tagName)
      });
    }, {});
  }
  function createTag(tagName) {
    function elementFactory(propsOrChildren, eventsOrChildren, childrenOrNone) {
      const [props, events, children] = Array.isArray(propsOrChildren) ? [void 0, void 0, propsOrChildren] : Array.isArray(eventsOrChildren) ? [propsOrChildren, void 0, eventsOrChildren] : [propsOrChildren, eventsOrChildren, childrenOrNone];
      return verboseElementFactory(props, events, children);
    }
    return elementFactory;
    function verboseElementFactory(props, events, children) {
      const element = document.createElement(tagName);
      events && Object.assign(element, events);
      props && forEach(
        renameKeys(props, {
          class: "className",
          for: "htmlFor"
        }),
        (value, key) => {
          runAndWatch(value, (value2) => {
            key !== "style" ? element[key] = value2 : forEach(
              value2,
              (value3, key2) => element.style[key2] = value3
            );
          });
        }
      );
      if (children) {
        children.forEach((child) => {
          if (typeof child === "string") {
            element.appendChild(document.createTextNode(child));
          } else {
            element.appendChild(child);
          }
          ;
        });
      }
      ;
      return element;
    }
  }
  var checkbox = modelElement(
    "input",
    "checked",
    { type: "checkbox" },
    (model) => ({
      onchange: () => model.set(!model.value)
    })
  );
  var textInput = modelElement(
    "input",
    "value",
    { type: "text" },
    (model) => ({
      onkeyup: ({ key, target }) => {
        key === "Enter" && target instanceof HTMLInputElement && model.set(target.value);
      }
    })
  );
  function modelElement(tag, modelKey, initProps, eventFactory) {
    return (model, props) => {
      return createTag(tag)({
        ...initProps,
        ...props,
        [modelKey]: model
      }, eventFactory(model));
    };
  }
  function labeled(labelText, element) {
    element.id ||= uniqueId("smork-input-");
    const output = [
      label({ for: element.id }, [labelText]),
      element
    ];
    if (element.type === "checkbox") {
      output.reverse();
    }
    ;
    return output;
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

  // src/templates/colony/css.js
  var colonyCss = '.colony { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;}.colony button {background-color: #444;color: #eee}.colony #sidebar {position: fixed;padding: 10px;top: 0;left: 0;bottom: 0;width: 200px;background-color: #333;color: #eee;display: flex;flex-direction: column;justify-content: space-between;}.colony .f-row {display: flex;flex-direction: row;}.colony .f-col {display: flex;flex-direction: column;}.colony .smol {font-size: 0.8em;color: #aaa;}.colony .relative {position: relative;}.colony .absolute {position: absolute;}.colony .topleft {top: 0;left: 0;}.colony .p-1 {padding: 1rem;};.colony .p-2 {padding: 2rem;}.colony .w-100 {width: 100%;}.colony .h-100 {height: 100%;}.colony .j-between {justify-content: space-between;}.colony .settings > div {margin-top: 5px;}';

  // src/templates/colony/colony.ts
  async function render(rawData, {
    in3D: in3D2 = false
  }) {
    const hideUI = ref(false);
    let graphContainer;
    const useNextLinks = ref(true);
    const showNextLinks = ref(false);
    const useDescendantLinks = ref(true);
    const filterString = ref("");
    let audioContainer;
    let audioLink;
    let audioImage;
    let audioName;
    let audioTags;
    let audioElement;
    const GraphRenderer = await importScript(window, "ForceGraph", `https://unpkg.com/${in3D2 ? "3d-" : ""}force-graph`);
    window.document.head.appendChild(style([colonyCss]));
    const container = div(
      {
        class: "colony",
        style: {
          position: "fixed",
          top: "0px",
          left: "0px",
          zIndex: "100"
        }
      },
      [
        div({
          style: hideUI.map((hide) => ({
            flexDirection: "column",
            height: "100vh",
            width: "100vh",
            backgroundColor: "#000",
            display: hide ? "none" : "flex"
          }))
        }, [
          graphContainer = div(),
          div({
            id: "sidebar"
          }, [
            div({
              class: "settings f-col"
            }, [
              button(
                {
                  style: { marginBottom: "5px" }
                },
                {
                  onclick: () => hideUI.set(true)
                },
                [
                  "Close Colony"
                ]
              ),
              h3(["Settings"]),
              div(
                labeled(
                  "Attract based on time",
                  checkbox(useNextLinks)
                )
              ),
              div(
                {
                  // style: displayNoneUnless(useNextLinks),
                  style: useNextLinks.map((useLinks) => ({
                    display: useLinks ? "block" : "none"
                  }))
                },
                labeled(
                  "Show time-based links",
                  checkbox(showNextLinks)
                )
              ),
              div(
                labeled(
                  "Attract to root clip",
                  checkbox(useDescendantLinks)
                )
              ),
              div([
                textInput(filterString, { placeholder: "Filter by name, style or ID" }),
                p({ class: "smol" }, [
                  "Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"
                ])
              ]),
              button({}, { onclick: redrawGraph }, [
                "Redraw"
              ])
            ]),
            audioContainer = div({ class: "w-100", style: { display: "none" } }, [
              div({ class: "relative" }, [
                audioLink = a({ target: "_blank" }, [
                  audioImage = img({ style: "opacity: 0.5", class: "w-100" })
                ]),
                div({ class: "absolute topleft", style: "width: 190px; padding: 5px;" }, [
                  audioName = div(),
                  audioTags = div({ class: "smol" })
                ])
              ]),
              audioElement = audio({ controls: true, class: "w-100" })
            ])
          ])
        ]),
        button({
          style: hideUI.map((hide) => ({
            position: "fixed",
            top: "0px",
            left: "0px",
            padding: "5px",
            zIndex: "100",
            display: hide ? "block" : "none"
          }))
        }, {
          onclick: () => hideUI.set(false)
        }, [
          "Reopen Colony"
        ])
      ]
    );
    document.body.appendChild(container);
    let graph = createGraph();
    function createGraph() {
      const graph2 = new GraphRenderer(
        graphContainer
      ).graphData(rawData).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(visibilityChecker).linkDirectionalParticles(1).nodeLabel(({ id: id2, name, tags: tags2, image_url }) => `
        <div class="relative" style="width: 200px;">
          <img src="${image_url}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${name || "[Untitled]"}</div>
            <div class="smol">${tags2 || "(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({ id: id2, name, tags: tags2, image_url, audio_url }) => {
        audioContainer.style.display = "block";
        audioLink.href = `https://suno.com/song/${id2}`;
        audioImage.src = image_url;
        audioName.innerText = name || "[Untitled]";
        audioTags.innerText = tags2 || "(no style)";
        audioElement.src = audio_url;
        audioElement.play();
      }).onNodeRightClick(({ id: id2 }) => {
        window.open(`https://suno.com/song/${id2}`);
      });
      if (in3D2) {
        graph2.linkOpacity((l) => l.isMain ? 1 : 0.2);
      } else {
        graph2.linkLineDash((l) => l.isMain ? null : [1, 2]);
      }
      ;
      return graph2;
    }
    ;
    async function redrawGraph() {
      new FinalizationRegistry(() => console.log("Previous graph destroyed, container removed from memory")).register(graph, "");
      graph._destructor();
      container.remove();
      await render(rawData, { in3D: in3D2 });
    }
    ;
    const data = graph.graphData();
    function visibilityChecker(link) {
      return !{
        descendant: true,
        next: !showNextLinks.value
      }[link.kind];
    }
    ;
    function applyLinkFilter(kind, useLinks) {
      let { nodes, links } = graph.graphData();
      if (!useLinks) {
        links = links.filter((l) => l.kind !== kind);
      } else {
        links.push(...data.links.filter((l) => l.kind === kind));
      }
      if (kind === "next") {
        links = links.filter((l) => l.kind !== "next");
        if (useLinks) {
          sortByDate(nodes);
          for (let i = 1; i < nodes.length; i++) {
            const source = nodes[i - 1];
            const target = nodes[i];
            links.push({
              source: source.id,
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
      graph.graphData({ nodes, links });
    }
    ;
    useNextLinks.watchImmediate((useLinks) => applyLinkFilter("next", useLinks));
    useDescendantLinks.watchImmediate((useLinks) => applyLinkFilter("descendant", useLinks));
    showNextLinks.watchImmediate(() => {
      graph.linkVisibility(visibilityChecker);
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
    filterString.watchImmediate((filter) => {
      filter = filter?.toLowerCase();
      const matchingNodes = filter ? data.nodes.filter((node) => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter)) : data.nodes;
      const existing = graph.graphData();
      const nodes = [
        ...matchingNodes.map((node) => existing.nodes.find(sameIdAs(node)) ?? node),
        ...filter ? data.nodes.filter((node) => matchingNodes.some((n) => n.rootId === node.rootId && n.id !== node.id)) : []
      ].map((node) => existing.nodes.find((n) => n.id === node.id) ?? node);
      const links = data.links.filter((link) => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target))).map(({ source, target, ...rest }) => ({ source: id(source), target: id(target), ...rest })).map((link) => existing.links.find((l) => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link);
      graph.graphData({ nodes, links });
      if (filter)
        graph.nodeVal((node) => matchingNodes.some((n) => n.id === node.id) ? 3 : node.val);
      else
        graph.nodeVal("val");
    });
    setTimeout(() => {
      useNextLinks.set(false);
      useDescendantLinks.set(false);
    }, 2e3);
    return container;
  }

  // src/templates/colony/standalone.ts
  var { graphData, in3D } = window.colonyData;
  render(graphData, { in3D });
})();
