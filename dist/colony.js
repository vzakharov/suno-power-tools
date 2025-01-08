window.templates = {"colony":"<head>\n  <style>\n    body { \n      margin: 0;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    }\n\n    #sidebar {\n      position: fixed;\n      padding: 10px;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      width: 200px;\n      background-color: #333;\n      color: #eee;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n    }\n\n    .f-row {\n      display: flex;\n      flex-direction: row;\n    }\n\n    .f-col {\n      display: flex;\n      flex-direction: column;\n    }\n\n    .smol {\n      font-size: 0.8em;\n      color: #aaa;\n    }\n\n    .relative {\n      position: relative;\n    }\n\n    .absolute {\n      position: absolute;\n    }\n\n    .topleft {\n      top: 0;\n      left: 0;\n    }\n\n    .p-1 {\n      padding: 1rem;\n    };\n\n    .p-2 {\n      padding: 2rem;\n    }\n\n    .w-100 {\n      width: 100%;\n    }\n    \n    .h-100 {\n      height: 100%;\n    }\n\n    .j-between {\n      justify-content: space-between;\n    }\n\n    .settings > div {\n      margin-top: 5px;\n    }\n\n  </style>\n  <script src=\"https://unpkg.com/___graph_url_slug___\"></script>\n</head>\n\n<body>\n  <div id=\"graph\">\n  </div>\n  <div id=\"sidebar\">\n    <div class=\"settings f-col\">\n      <h3>Settings</h3>\n      <!-- Use next links -->\n      <div>\n        <input type=\"checkbox\" id=\"useNextLinks\" data-type=\"linkToggle\" data-kind=\"next\" checked>\n        <label for=\"useNextLinks\">Attract based on time</label>\n      </div>\n      <!-- Show next links -->\n      <div id=\"showNextLinksContainer\">\n        <input type=\"checkbox\" id=\"showNextLinks\" data-type=\"linkToggle\" data-kind=\"descendant\">\n        <label for=\"showNextLinks\">Show time-based links</label>\n      </div>\n      <!-- Use descendant links -->\n      <div>\n        <input type=\"checkbox\" id=\"useDescendantLinks\" data-type=\"linkToggle\" data-kind=\"descendant\" checked>\n        <label for=\"useDescendantLinks\">Attract to root clip</label>\n      </div>\n      <!-- Filter -->\n      <div>\n        <input type=\"text\" id=\"filter\" placeholder=\"Filter by name, style or ID\">\n        <p class=\"smol\">\n          Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)\n        </p>\n      </div>\n    </div>\n    <div id=\"audioContainer\" class=\"w-100\" style=\"display: none;\">\n      <div class=\"relative\">\n        <a id=\"audioLink\" target=\"_blank\">\n          <img id=\"audioImage\" style=\"opacity: 0.5\" class=\"w-100\">\n        </a>\n        <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n          <div id=\"audioName\"></div>\n          <div class=\"smol\" id=\"audioTags\"></div>\n        </div>\n      </div>\n      <audio controls id=\"audio\" class=\"w-100\"></audio>\n    </div>\n  </div>    \n  <div id=\"data\" style=\"display: none;\">\n    ___data___\n  </div>\n  <script>\n\n    const use3DGraph = ___use3DGraph___;\n    const data = JSON.parse(document.getElementById('data').innerText);\n    let graph = renderGraph(data);\n    Object.assign(window, { data, graph });\n\n    function visibilityChecker(link) {\n      return !{\n        descendant: true,\n        next: !document.getElementById('showNextLinks').checked\n      }[link.kind];\n    };\n\n    function renderGraph(data) {\n      const graph = new ___GraphRenderer___()\n        (document.getElementById('graph'))\n        .graphData(data)\n        .backgroundColor('#001')\n        .linkAutoColorBy('kind')\n        .nodeAutoColorBy('rootId')\n        .linkLabel('kind')\n        .linkVisibility(visibilityChecker)\n        .linkDirectionalParticles(1)\n        .nodeLabel(({ id, name, tags, image_url }) => `\n          <div class=\"relative\" style=\"width: 200px;\">\n            <img src=\"${image_url}\" style=\"opacity: 0.5; width: 200px\">\n            <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n              <div>${name || '[Untitled]'}</div>\n              <div class=\"smol\">${tags || '(no style)'}</div>\n            </div>\n          </div>\n          <div class=\"smol\">\n            Click to play, right-click to open in Suno\n          </div>\n        `)\n        .onNodeClick(({ id, name, tags, image_url, audio_url }) => {\n          document.getElementById('audioContainer').style.display = 'block';\n          document.getElementById('audioLink').href = `https://suno.com/song/${id}`;\n          document.getElementById('audioImage').src = image_url;\n          document.getElementById('audioName').innerText = name || '[Untitled]';\n          document.getElementById('audioTags').innerText = tags || '(no style)';\n          const audio = document.getElementById('audio');\n          audio.src = audio_url;\n          audio.play();\n        })\n        .onNodeRightClick(({ id }) => {\n          window.open(`https://suno.com/song/${id}`);\n        });\n      if ( use3DGraph ) {\n        graph.linkOpacity(l => l.isMain ? 1 : 0.2)\n      } else {\n        graph.linkLineDash(l => l.isMain ? undefined : [1, 2])\n      }\n      return graph;\n    };\n\n    document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(checkbox => {\n      checkbox.addEventListener('change', () => {\n        const kind = checkbox.getAttribute('data-kind');\n        applyLinkFilter(checkbox);\n        if ( kind === 'next' ) {\n          document.getElementById('showNextLinksContainer').style.display = useLinks ? 'block' : 'none';\n        };\n      });\n    });\n\n    function applyLinkFilter(checkbox) {\n      const kind = checkbox.getAttribute('data-kind');\n      const useLinks = checkbox.checked;\n      let { nodes, links } = graph.graphData();\n      if ( !useLinks ) {\n        links = links.filter(l => l.kind !== kind);\n      } else {\n        links.push(...data.links.filter(l => l.kind === kind));\n      }\n      graph.graphData({ nodes, links });\n    };\n\n    document.getElementById('showNextLinks').addEventListener('change', () => {\n      graph.linkVisibility(visibilityChecker);\n    });\n    \n    // Filter (on Enter key)\n    document.getElementById('filter').addEventListener('keyup', e => {\n      if (e.keyCode === 13) {\n        const filter = e.target.value.toLowerCase();\n        const matchingNodes = filter \n          ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))\n          : data.nodes;\n        // const sameRootNodes = data.nodes.filter(node => matchingNodes.some(n => n.id !== node.id && n.rootId === node.rootId));\n        // const relevantNodes = [...matchingNodes, ...sameRootNodes];\n        const existing = graph.graphData();\n        const nodes = [\n          ...matchingNodes.map(node => existing.nodes.find(n => n.id === node.id) ?? node),\n          ...filter \n            ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))\n            : []\n        ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);\n        const links = data.links\n          .filter(link => nodes.some(n => n.id === link.source.id) && nodes.some(n => n.id === link.target.id))\n          .map(({ source: { id: source }, target: { id: target }, ...rest }) => ({ source, target, ...rest }))\n          .map(link => existing.links.find(l => l.source.id === link.source.id && l.target.id === link.target.id) ?? link);\n        graph.graphData({ nodes, links });\n        if ( filter )\n          graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);\n        else\n          graph.nodeVal('val');\n        document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(applyLinkFilter);\n      };\n    });\n\n  </script>\n</body>"};
(() => {
  // src/utils.ts
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
    return items.sort((a2, b) => isoStringToTimestamp(dateAccessor(a2)) - isoStringToTimestamp(dateAccessor(b)));
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
    const canvas = document.createElement("canvas");
    canvas.width = img1.width;
    canvas.height = img1.height;
    const ctx = canvas.getContext("2d") ?? $throw("Canvas 2D context not supported");
    ctx.drawImage(img1, 0, 0);
    const img1Data = ctx.getImageData(0, 0, img1.width, img1.height);
    ctx.drawImage(img2, 0, 0);
    const img2Data = ctx.getImageData(0, 0, img2.width, img2.height);
    const data1 = img1Data.data;
    const data2 = img2Data.data;
    const len = data1.length;
    let diff = 0;
    for (let i = 0; i < len; i += 4) {
      for (let j = 0; j < 3; j++) {
        diff += Math.abs(data1[i + j] - data2[i + j]);
      }
    }
    ;
    const avgDiff = diff / (len / 4);
    canvas.remove();
    return avgDiff < 32;
    //! (This is a very naive implementation; a more sophisticated one would involve comparing the images in the frequency domain, but that's a bit too much for this project)
  }

  // src/lodashish.ts
  function find(arr, filter2) {
    return arr.find(createPredicate(filter2));
  }
  function createPredicate(filter2) {
    return function(item) {
      return Object.entries(filter2).every(([key, value]) => item[key] === value);
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

  // src/manager.ts
  function getSuno() {
    return window.suno ?? $throw("`suno` object not found in `window`. Have you followed the setup instructions?");
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
    async save(data) {
      const transaction = await dbTransaction("readwrite");
      transaction.objectStore(storeName).put(data, this.key);
      return transactionCompletionPromise(transaction);
    }
    async clear() {
      const transaction = await dbTransaction("readwrite");
      transaction.objectStore(storeName).delete(this.key);
      return transactionCompletionPromise(transaction);
    }
  };

  // src/pork.ts
  //! Pork, the PORtable framewORK
  var refBrand = Symbol("ref");
  function ref() {
    return {
      [refBrand]: true,
      value: void 0
    };
  }
  function assert(ref2) {
    if (ref2.value === void 0) {
      throw new Error("Ref value is undefined");
    }
    ;
  }
  function ensure(ref2) {
    assert(ref2);
    return ref2.value;
  }
  function isRef(candidate) {
    return candidate?.[refBrand];
  }
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
    "label"
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
    label
  } = createTags(SUPPORTED_TAGS);
  function createTags(tagNames) {
    return tagNames.reduce((acc, tagName) => {
      return Object.assign(acc, {
        [tagName]: tag(tagName)
      });
    }, {});
  }
  function tag(tagName) {
    function element(...args) {
      const ref2 = isRef(args[0]) ? args.shift() : void 0;
      const props = Array.isArray(args[0]) ? void 0 : args.shift();
      const children = args[0];
      return elementFactory(ref2, props, children);
    }
    ;
    function elementFactory(ref2, props, children) {
      const element2 = document.createElement(tagName);
      if (props) {
        Object.assign(element2, props);
        if (props.class) {
          element2.className = props.class;
        }
        ;
        if (element2 instanceof HTMLLabelElement && props.for) {
          element2.htmlFor = props.for;
        }
        ;
        Object.entries(props.style ?? {}).forEach(([key, value]) => {
          element2.style[key] = value;
        });
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
      if (ref2) {
        ref2.value = element2;
      }
      ;
      return element2;
    }
    return element;
  }
  var checkbox = boundElementFactory(input, { type: "checkbox" });
  var textInput = boundElementFactory(input, { type: "text" });
  function boundElementFactory(baseFactory, boundProps) {
    return (...args) => {
      const element = baseFactory(...args);
      Object.assign(element, boundProps);
      return element;
    };
  }
  function labeled(labelText, element) {
    element.id ??= uniqueId("input-");
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
    const script3 = win.document.createElement("script");
    script3.type = "text/javascript";
    script3.src = url;
    win.document.head.appendChild(script3);
    return new Promise((resolve) => {
      script3.onload = () => {
        resolve(win[windowKey]);
      };
    });
  }

  // src/templates/colony.ts
  async function render(rawData, {
    in3D = false
  }) {
    const graphContainer = ref();
    const useNextLinksCheckbox = ref();
    const showNextLinksContainer = ref();
    const showNextLinksCheckbox = ref();
    const useDescendantLinksCheckbox = ref();
    const filterInput = ref();
    const audioRefs = {
      container: ref(),
      link: ref(),
      image: ref(),
      name: ref(),
      tags: ref(),
      audio: ref()
    };
    const template = [
      head([
        style(
          // tba
        )
      ]),
      body([
        div(graphContainer),
        div({ id: "sidebar" }, [
          div({
            class: "settings f-col"
          }, [
            h3(["Settings"]),
            div(
              labeled(
                "Attract based on time",
                checkbox(useNextLinksCheckbox)
              )
            ),
            div(
              showNextLinksContainer,
              labeled(
                "Show time-based links",
                checkbox(showNextLinksCheckbox)
              )
            ),
            div(
              labeled(
                "Attract to root clip",
                checkbox(useDescendantLinksCheckbox)
              )
            ),
            div([
              textInput(filterInput, { placeholder: "Filter by name, style or ID" }),
              p({ class: "smol" }, [
                "Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)"
              ])
            ])
          ]),
          div(audioRefs.container, { class: "w-100", style: { display: "none" } }, [
            div({ class: "relative" }, [
              a(audioRefs.link, { target: "_blank" }, [
                img(audioRefs.image, { style: "opacity: 0.5", class: "w-100" })
              ]),
              div({ class: "absolute topleft", style: "width: 190px; padding: 5px;" }, [
                div(audioRefs.name),
                div(audioRefs.tags, { class: "smol" })
              ])
            ]),
            audio(audioRefs.audio, { controls: true, class: "w-100" })
          ])
        ])
      ])
    ];
    async function setup(win) {
      const GraphRenderer = await importScript(win, "ForceGraph", `https://unpkg.com/${in3D ? "3d-" : ""}force-graph`);
      //! because ForceGraph mutates links by including source and target nodes instead of their IDs
      const graph = new GraphRenderer(
        ensure(graphContainer)
      ).graphData(rawData).backgroundColor("#001").linkAutoColorBy("kind").nodeAutoColorBy("rootId").linkLabel("kind").linkVisibility(visibilityChecker).linkDirectionalParticles(1).nodeLabel(({ id: id2, name, tags, image_url }) => `
        <div class="relative" style="width: 200px;">
          <img src="${image_url}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${name || "[Untitled]"}</div>
            <div class="smol">${tags || "(no style)"}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `).onNodeClick(({ id: id2, name, tags, image_url, audio_url }) => {
        ensure(audioRefs.container).style.display = "block";
        ensure(audioRefs.link).href = `https://suno.com/song/${id2}`;
        ensure(audioRefs.image).src = image_url;
        ensure(audioRefs.name).innerText = name || "[Untitled]";
        ensure(audioRefs.tags).innerText = tags || "(no style)";
        const audio2 = ensure(audioRefs.audio);
        audio2.src = audio_url;
        audio2.play();
      }).onNodeRightClick(({ id: id2 }) => {
        window.open(`https://suno.com/song/${id2}`);
      });
      if (in3D) {
        graph.linkOpacity((l) => l.isMain ? 1 : 0.2);
      } else {
        graph.linkLineDash((l) => l.isMain ? null : [1, 2]);
      }
      ;
      const data = graph.graphData();
      function visibilityChecker(link) {
        return !{
          descendant: true,
          next: !ensure(showNextLinksCheckbox).checked
        }[link.kind];
      }
      ;
      function applyLinkFilter(kind, checkbox2) {
        const useLinks = checkbox2.checked;
        let { nodes, links } = graph.graphData();
        if (!useLinks) {
          links = links.filter((l) => l.kind !== kind);
        } else {
          links.push(...data.links.filter((l) => l.kind === kind));
        }
        graph.graphData({ nodes, links });
      }
      ;
      function applyCheckboxFilters(firstTime = false) {
        mapValues({
          next: useNextLinksCheckbox,
          descendant: useDescendantLinksCheckbox
        }, (checkbox2, kind) => $with(ensure(checkbox2), (checkbox3) => {
          applyLinkFilter(kind, checkbox3);
          if (firstTime) {
            checkbox3.addEventListener("change", () => {
              if (kind === "next") {
                ensure(showNextLinksContainer).style.display = checkbox3.checked ? "block" : "none";
              }
              ;
            });
          }
          ;
        }));
      }
      ;
      applyCheckboxFilters(true);
      ensure(showNextLinksCheckbox).addEventListener("change", () => {
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
      ensure(filterInput).addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          const filter2 = ensure(filterInput).value.toLowerCase();
          const matchingNodes = filter2 ? data.nodes.filter((node) => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter2)) : data.nodes;
          const existing = graph.graphData();
          const nodes = [
            ...matchingNodes.map((node) => existing.nodes.find(sameIdAs(node)) ?? node),
            ...filter2 ? data.nodes.filter((node) => matchingNodes.some((n) => n.rootId === node.rootId && n.id !== node.id)) : []
          ].map((node) => existing.nodes.find((n) => n.id === node.id) ?? node);
          const links = data.links.filter((link) => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target))).map(({ source, target, ...rest }) => ({ source: id(source), target: id(target), ...rest })).map((link) => existing.links.find((l) => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link);
          graph.graphData({ nodes, links });
          if (filter2)
            graph.nodeVal((node) => matchingNodes.some((n) => n.id === node.id) ? 3 : node.val);
          else
            graph.nodeVal("val");
          applyCheckboxFilters();
        }
      });
    }
    ;
    return { template, setup };
  }

  // src/templating.ts
  function renderTemplate(template, values) {
    return Object.keys(values).reduce((acc, key) => {
      return acc.replace(`___${key}___`, values[key]);
    }, template);
  }

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
        const { data: { clips } } = await getSuno().root.apiClient.GET("/api/feed/v2", {
          params: {
            query: {
              is_liked: true,
              page: this.state.lastProcessedPage + 1
            }
          }
        });
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
      const clip = await getSuno().root.clips.loadClipById(id) ?? missingClip(id);
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
      for (let i = 0; i < this.state.rawClips.length; i++) {
        const clip = this.state.rawClips[i];
        if (i % 100 === 0) {
          console.log(`Processed ${i} clips out of ${this.state.rawClips.length}`);
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
      for (const rootClip of rootClips.slice(1)) {
        syntheticLinks.push([currentParent.id, rootClip.id, "next"]);
        if (rootClip?.children?.length) {
          currentParent = rootClip;
        }
        ;
      }
      ;
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
    get graphData() {
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
      const formatLink = ([source, target, kind]) => ({
        source,
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
    getHtml(mode) {
      const in3D = mode?.toLowerCase() === "3d";
      console.log("Rendering your colony, give it a few seconds...");
      return renderTemplate(window.templates.colony, {
        data: JSON.stringify(this.graphData),
        use3DGraph: String(in3D),
        GraphRenderer: in3D ? "ForceGraph3D" : "ForceGraph",
        graph_url_slug: in3D ? "3d-force-graph" : "force-graph"
      });
    }
    render(...params) {
      const html3 = this.getHtml(...params);
      const win = window.open() ?? $throw("Failed to open a new window.");
      win.document.write(html3);
    }
    async renderWithPork(...[mode]) {
      const { template, setup } = await render(this.graphData, { in3D: mode?.toLowerCase() === "3d" });
      const win = window.open() ?? $throw("Failed to open a new window.");
      win.document.children[0].replaceChildren(...template);
      setup(win);
    }
    renderToFile(...params) {
      const html3 = this.getHtml(...params);
      const blob = new Blob([html3], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a2 = document.createElement("a");
      a2.href = url;
      a2.download = "suno_colony.html";
      a2.click();
      URL.revokeObjectURL(url);
    }
  };
  var colony = new Colony();
  colony.stateLoaded.promise.then(() => {
    console.log("Welcome to Vova\u2019s Suno Colony! This is a nifty tool to visualize your liked clips and the relationships between them, such as extensions, inpaints, covers, etc., in a graph format. It takes a bit of time and hacks to build, but hopefully it\u2019ll be worth it!");
    const { state: { allPagesProcessed, allLinksBuilt } } = colony;
    if (!allPagesProcessed || !allLinksBuilt) {
      console.log("Run `await vovas.colony.build()` to start or continue building your colony!");
    } else {
      console.log("Your colony is built, run `await vovas.colony.render()` to view it!");
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
  mutate(window, { vovas: { Colony, colony } });
})();
