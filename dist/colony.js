window.templates = {"colony":"<head>\n  <style>\n    body { \n      margin: 0;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    }\n\n    #sidebar {\n      position: fixed;\n      padding: 10px;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      width: 200px;\n      background-color: #333;\n      color: #eee;\n      display: flex;\n      flex-direction: column;\n      justify-content: space-between;\n    }\n\n    .f-row {\n      display: flex;\n      flex-direction: row;\n    }\n\n    .f-col {\n      display: flex;\n      flex-direction: column;\n    }\n\n    .smol {\n      font-size: 0.8em;\n      color: #aaa;\n    }\n\n    .relative {\n      position: relative;\n    }\n\n    .absolute {\n      position: absolute;\n    }\n\n    .topleft {\n      top: 0;\n      left: 0;\n    }\n\n    .p-1 {\n      padding: 1rem;\n    };\n\n    .p-2 {\n      padding: 2rem;\n    }\n\n    .w-100 {\n      width: 100%;\n    }\n    \n    .h-100 {\n      height: 100%;\n    }\n\n    .j-between {\n      justify-content: space-between;\n    }\n\n    .settings > div {\n      margin-top: 5px;\n    }\n\n  </style>\n  <script src=\"//unpkg.com/___graph_url_slug___\"></script>\n</head>\n\n<body>\n  <div id=\"graph\">\n  </div>\n  <div id=\"sidebar\">\n    <div class=\"settings f-col\">\n      <h3>Settings</h3>\n      <!-- Use next links -->\n      <div>\n        <input type=\"checkbox\" id=\"useNextLinks\" data-type=\"linkToggle\" data-kind=\"next\" checked>\n        <label for=\"useNextLinks\">Attract based on time</label>\n      </div>\n      <!-- Show next links -->\n      <div id=\"showNextLinksContainer\">\n        <input type=\"checkbox\" id=\"showNextLinks\" data-type=\"linkToggle\" data-kind=\"descendant\">\n        <label for=\"showNextLinks\">Show time-based links</label>\n      </div>\n      <!-- Use descendant links -->\n      <div>\n        <input type=\"checkbox\" id=\"useDescendantLinks\" data-type=\"linkToggle\" data-kind=\"descendant\" checked>\n        <label for=\"useDescendantLinks\">Attract to root clip</label>\n      </div>\n      <!-- Filter -->\n      <div>\n        <input type=\"text\" id=\"filter\" placeholder=\"Filter by name, style or ID\">\n        <p class=\"smol\">\n          Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)\n        </p>\n      </div>\n    </div>\n    <div id=\"audioContainer\" class=\"w-100\" style=\"display: none;\">\n      <div class=\"relative\">\n        <a id=\"audioLink\" target=\"_blank\">\n          <img id=\"audioImage\" style=\"opacity: 0.5\" class=\"w-100\">\n        </a>\n        <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n          <div id=\"audioName\"></div>\n          <div class=\"smol\" id=\"audioTags\"></div>\n        </div>\n      </div>\n      <audio controls id=\"audio\" class=\"w-100\"></audio>\n    </div>\n  </div>    \n  <div id=\"data\" style=\"display: none;\">\n    ___data___\n  </div>\n  <script>\n\n    const use3DGraph = ___use3DGraph___;\n    const data = JSON.parse(document.getElementById('data').innerText);\n    let graph = renderGraph(data);\n    Object.assign(window, { data, graph });\n\n    function visibilityChecker(link) {\n      return !{\n        descendant: true,\n        next: !document.getElementById('showNextLinks').checked\n      }[link.kind];\n    };\n\n    function renderGraph(data) {\n      const graph = new ___GraphRenderer___()\n        (document.getElementById('graph'))\n        .graphData(data)\n        .backgroundColor('#001')\n        .linkAutoColorBy('kind')\n        .nodeAutoColorBy('rootId')\n        .linkLabel('kind')\n        .linkVisibility(visibilityChecker)\n        .linkDirectionalParticles(1)\n        .nodeLabel(({ id, name, tags, image_url }) => `\n          <div class=\"relative\" style=\"width: 200px;\">\n            <img src=\"${image_url}\" style=\"opacity: 0.5; width: 200px\">\n            <div class=\"absolute topleft\" style=\"width: 190px; padding: 5px;\">\n              <div>${name || '[Untitled]'}</div>\n              <div class=\"smol\">${tags || '(no style)'}</div>\n            </div>\n          </div>\n          <div class=\"smol\">\n            Click to play, right-click to open in Suno\n          </div>\n        `)\n        .onNodeClick(({ id, name, tags, image_url, audio_url }) => {\n          document.getElementById('audioContainer').style.display = 'block';\n          document.getElementById('audioLink').href = `https://suno.com/song/${id}`;\n          document.getElementById('audioImage').src = image_url;\n          document.getElementById('audioName').innerText = name || '[Untitled]';\n          document.getElementById('audioTags').innerText = tags || '(no style)';\n          const audio = document.getElementById('audio');\n          audio.src = audio_url;\n          audio.play();\n        })\n        .onNodeRightClick(({ id }) => {\n          window.open(`https://suno.com/song/${id}`);\n        });\n      if ( use3DGraph ) {\n        graph.linkOpacity(l => l.isMain ? 1 : 0.2)\n      } else {\n        graph.linkLineDash(l => l.isMain ? undefined : [1, 2])\n      }\n      return graph;\n    };\n\n    document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(checkbox => {\n      checkbox.addEventListener('change', () => {\n        const kind = checkbox.getAttribute('data-kind');\n        applyLinkFilter(checkbox);\n        if ( kind === 'next' ) {\n          document.getElementById('showNextLinksContainer').style.display = useLinks ? 'block' : 'none';\n        };\n      });\n    });\n\n    function applyLinkFilter(checkbox) {\n      const kind = checkbox.getAttribute('data-kind');\n      const useLinks = checkbox.checked;\n      let { nodes, links } = graph.graphData();\n      if ( !useLinks ) {\n        links = links.filter(l => l.kind !== kind);\n      } else {\n        links.push(...data.links.filter(l => l.kind === kind));\n      }\n      graph.graphData({ nodes, links });\n    };\n\n    document.getElementById('showNextLinks').addEventListener('change', () => {\n      graph.linkVisibility(visibilityChecker);\n    });\n    \n    // Filter (on Enter key)\n    document.getElementById('filter').addEventListener('keyup', e => {\n      if (e.keyCode === 13) {\n        const filter = e.target.value.toLowerCase();\n        const matchingNodes = filter \n          ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))\n          : data.nodes;\n        // const sameRootNodes = data.nodes.filter(node => matchingNodes.some(n => n.id !== node.id && n.rootId === node.rootId));\n        // const relevantNodes = [...matchingNodes, ...sameRootNodes];\n        const existing = graph.graphData();\n        const nodes = [\n          ...matchingNodes.map(node => existing.nodes.find(n => n.id === node.id) ?? node),\n          ...filter \n            ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))\n            : []\n        ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);\n        const links = data.links\n          .filter(link => nodes.some(n => n.id === link.source.id) && nodes.some(n => n.id === link.target.id))\n          .map(({ source: { id: source }, target: { id: target }, ...rest }) => ({ source, target, ...rest }))\n          .map(link => existing.links.find(l => l.source.id === link.source.id && l.target.id === link.target.id) ?? link);\n        graph.graphData({ nodes, links });\n        if ( filter )\n          graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);\n        else\n          graph.nodeVal('val');\n        document.querySelectorAll('[data-type=\"linkToggle\"]').forEach(applyLinkFilter);\n      };\n    });\n\n  </script>\n</body>"};
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
    const input = document.createElement("input");
    input.type = "file";
    input.click();
    return new Promise((resolve) => {
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          return resolve(void 0);
        }
        ;
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
          input.remove();
        };
        reader.readAsText(file);
      };
    });
  }
  function isoStringToTimestamp(isoString) {
    return isoString ? new Date(isoString).getTime() : 0;
  }
  function sortByDate(items, dateAccessor = (item) => item.created_at) {
    return items.sort((a, b) => isoStringToTimestamp(dateAccessor(a)) - isoStringToTimestamp(dateAccessor(b)));
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
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
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

  // src/templating.ts
  function renderTemplate(template, values) {
    return Object.keys(values).reduce((acc, key) => {
      return acc.replace(`___${key}___`, values[key]);
    }, template);
  }

  // src/scripts/colony.ts
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
        const a = document.createElement("a");
        a.href = url;
        a.download = "suno_colony.json";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await this.storage.save(this.state);
      }
    }
    async build() {
      if (!this.state.allPagesProcessed) {
        await this.fetchClips();
      }
      ;
      if (!this.state.allLinksBuilt) {
        await this.buildLinks();
      }
      ;
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
      //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
      if (id.startsWith("m_"))
        id = id.slice(2);
      //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
      return this.rawClipsById[id] ??= this.state.rawClips.find(
        (clip) => isV2AudioFilename(id) ? clip.audio_url.includes(id) : clip.id === id
      );
    }
    async getClipById(id) {
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
      const formatLink = ([source, target, kind]) => ({
        source,
        target,
        kind,
        color: kind === "next" ? "#006" : void 0
        //! (To make time-based links less prominent on a dark background)
      });
      const links = this.state.links.map(formatLink).map((link) => ({
        ...link,
        isMain: this.getTotalDescendants(link.target) > 1
      }));
      const result = {
        nodes: this.sortedClips.map(({ id, title: name, metadata: { tags }, created_at, children, audio_url, image_url, root }) => ({
          id,
          name: name || tags || created_at || id,
          audio_url,
          image_url,
          tags,
          rootId: root?.id,
          // val: Math.log10(this.getTotalDescendants(id) + 1),
          val: id === root?.id && children?.length ? 2 : children?.length ? 1 : 0.5
        })),
        links: [
          ...this.syntheticLinks.map(formatLink),
          ...links
          // ...filter(links, { isMain: true as const })
          // //! (We're making main links twice as forceful as the rest, to make them attract the nodes more)
        ]
      };
      return result;
    }
    render(mode) {
      const win = window.open();
      if (!win) {
        console.error("Failed to open new window.");
        return;
      }
      ;
      const in3D = mode?.toLowerCase() === "3d";
      win.document.write(renderTemplate(window.templates.colony, {
        data: JSON.stringify(this.graphData),
        use3DGraph: String(in3D),
        GraphRenderer: in3D ? "ForceGraph3D" : "ForceGraph",
        graph_url_slug: in3D ? "3d-force-graph" : "force-graph"
      }));
    }
  };
  var colony = new Colony();
  colony.stateLoaded.promise.then(() => {
    console.log("Colony state loaded");
    const { state: { allPagesProcessed, allLinksBuilt } } = colony;
    if (!allPagesProcessed || !allLinksBuilt) {
      console.log("Colony state is incomplete. Run `await vovas.colony.build()` to complete it.");
    } else {
      console.log("Colony state is complete, you can now run `await vovas.colony.render()` to view the colony.");
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
