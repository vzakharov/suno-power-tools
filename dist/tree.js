window.templates = {"tree":"<head>\n  <style>\n    body { \n      margin: 0;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n    }\n\n    #sidebar {\n      position: fixed;\n      padding: 10px;\n      top: 0;\n      left: 0;\n      bottom: 0;\n      width: 200px;\n      background-color: #333;\n      color: #eee;\n    }\n\n  </style>\n  <script src=\"//unpkg.com/force-graph\"></script>\n</head>\n\n<body>\n  <div id=\"graph\">\n  </div>\n  <div id=\"sidebar\">\n    <h3>Settings</h3>\n    <input type=\"checkbox\" id=\"useNextLinks\" checked>\n    <label for=\"useNextLinks\">Put clips created at a similar time next to each other</label>\n  </div>    \n  <div id=\"data\" style=\"display: none;\">\n    __data__\n  </div>\n  <script>\n\n\n    const data = JSON.parse(document.getElementById('data').innerText);\n\n    const graph = new ForceGraph()\n      (document.getElementById('graph'))\n      .backgroundColor('#111')\n      .linkAutoColorBy('kind')\n      .nodeAutoColorBy('rootId')\n      .linkLabel('kind')\n      .linkVisibility(l => !['descendant', 'next'].includes(l.kind))\n      .linkLineDash(l => l.isMain ? undefined : [1, 2])\n      .linkDirectionalParticles(1)\n      .graphData(data);\n\n    const useNextLinksCheckbox = document.getElementById('useNextLinks');\n    useNextLinksCheckbox.addEventListener('change', () => {\n      const useNextLinks = useNextLinksCheckbox.checked;\n      let { nodes, links } = graph.graphData();\n      if ( !useNextLinks ) {\n        links = links.filter(l => l.kind !== 'next');\n      };\n      graph.graphData({ nodes, links });\n    });\n\n\n  </script>\n</body>"};
(() => {
  // src/utils.ts
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
  function filter(arr, filter2) {
    return arr.filter(createPredicate(filter2));
  }
  function createPredicate(filter2) {
    return function(item) {
      return Object.entries(filter2).every(([key, value]) => item[key] === value);
    };
  }

  // src/manager.ts
  function suno() {
    return window.suno ?? $throw("`suno` object not found in `window`. Have you followed the setup instructions?");
  }

  // src/templating.ts
  function renderTemplate(template, values) {
    return Object.keys(values).reduce((acc, key) => {
      return acc.replace(`__${key}__`, values[key]);
    }, template);
  }

  // src/scripts/tree.ts
  var Tree = class _Tree {
    constructor(rawClips = [], lastProcessedPage = -1, allPagesProcessed = false, links = [], allLinksBuilt = false) {
      this.rawClips = rawClips;
      this.lastProcessedPage = lastProcessedPage;
      this.allPagesProcessed = allPagesProcessed;
      this.links = links;
      this.allLinksBuilt = allLinksBuilt;
    }
    get config() {
      return [this.rawClips, this.lastProcessedPage, this.allPagesProcessed, this.links, this.allLinksBuilt];
    }
    set config(config) {
      Object.assign(this, new _Tree(...config));
    }
    reset() {
      this.config = [];
      console.log("Tree reset. Run build() to start building it again.");
    }
    async loadState() {
      const json = await uploadTextFile();
      if (!json) {
        console.log("No file selected, aborting.");
        return;
      }
      ;
      this.config = JSON.parse(json);
    }
    saveState() {
      const json = JSON.stringify(this.config);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "suno_tree.json";
      a.click();
      URL.revokeObjectURL(url);
    }
    async build() {
      if (!this.allPagesProcessed) {
        await this.fetchClips();
      }
      ;
      if (!this.allLinksBuilt) {
        await this.buildLinks();
      }
      ;
    }
    async fetchClips() {
      console.log("Fetching liked clips...");
      while (true) {
        await atLeast(1e3);
        //! (to avoid rate limiting)
        const { data: { clips } } = await suno().root.apiClient.GET("/api/feed/v2", {
          params: {
            query: {
              is_liked: true,
              page: this.lastProcessedPage + 1
            }
          }
        });
        if (!clips.length) {
          this.allPagesProcessed = true;
          break;
        }
        ;
        this.rawClips.push(...clips);
        this.lastProcessedPage++;
        console.log(`Processed page ${this.lastProcessedPage}; total clips: ${this.rawClips.length}`);
      }
    }
    rawClipsById = {};
    async loadClip(id) {
      await atLeast(1e3);
      //! (to avoid rate limiting)
      console.log(`Clip ${id} not found in cache, loading...`);
      const clip = await suno().root.clips.loadClipById(id) ?? missingClip(id);
      this.rawClips.push(clip);
      return clip;
    }
    getClipByIdSync(id) {
      //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
      if (id.startsWith("m_"))
        id = id.slice(2);
      //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
      return this.rawClipsById[id] ??= this.rawClips.find(
        (clip) => isV2AudioFilename(id) ? clip.audio_url.includes(id) : clip.id === id
      );
    }
    async getClipById(id) {
      return this.getClipByIdSync(id) ?? await this.loadClip(id);
    }
    async buildLinks() {
      console.log("Building links...");
      for (let i = 0; i < this.rawClips.length; i++) {
        const clip = this.rawClips[i];
        if (i % 100 === 0) {
          console.log(`Processed ${i} clips out of ${this.rawClips.length}`);
        }
        ;
        const { metadata } = clip;
        const [parentId, kind] = "history" in metadata ? $with(
          metadata.history[0],
          (parent) => typeof parent === "string" ? [parent, "extend"] : parent.infill ? [parent.id, "inpaint"] : [parent.id, "extend"]
        ) : "concat_history" in metadata ? [metadata.concat_history[1].id, "apply"] : "cover_clip_id" in metadata ? [metadata.cover_clip_id, "cover"] : "upsample_clip_id" in metadata ? [metadata.upsample_clip_id, "remaster"] : "type" in metadata && metadata.type === "edit_crop" ? await findCropBaseClipId(clip, this.rawClips).then(
          (id) => id ? [id, "crop"] : [void 0, void 0]
        ) : [void 0, void 0];
        if (parentId) {
          this.links.push([
            (await this.getClipById(parentId)).id,
            //! (Because the actual clip ID might be different from the one in the history)
            clip.id,
            kind
          ]);
        }
      }
      ;
      this.allLinksBuilt = true;
      console.log(`Built ${this.links.length} links.`);
    }
    _linkedClips;
    get linkedClips() {
      return this._linkedClips ??= this.getLinkedClips();
    }
    getLinkedClips() {
      const linkedClips = this.links.reduce(
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
        jsonClone(this.rawClips)
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
    get rootLinks() {
      const rootLinks = [];
      const { rootClips } = this;
      let currentParent = rootClips[0];
      for (const rootClip of rootClips.slice(1)) {
        rootLinks.push([currentParent.id, rootClip.id, "next"]);
        if (rootClip?.children?.length) {
          currentParent = rootClip;
        }
        ;
      }
      ;
      //! Link every clip with children to its root, for better visualization.
      for (const clip of this.linkedClips.filter(({ children }) => children?.length)) {
        rootLinks.push([(clip.root ?? $throw(`Clip ${clip.id} has no root.`)).id, clip.id, "descendant"]);
      }
      ;
      return rootLinks;
    }
    getTotalDescendants(clipId) {
      const clip = find(this.linkedClips, { id: clipId }) ?? $throw(`Clip ${clipId} not found.`);
      return clip.totalDescendants ??= 1 + (clip.children?.reduce((sum, { clip: { id: childId } }) => sum + this.getTotalDescendants(childId), 0) ?? 0);
    }
    get graphData() {
      const formatLink = ([source, target, kind]) => ({
        source,
        target,
        kind
      });
      const links = this.links.map(formatLink).map((link) => ({
        ...link,
        isMain: this.getTotalDescendants(link.target) > 1
      }));
      const result = {
        nodes: this.sortedClips.map(({ id, title: name, metadata: { tags }, created_at, children, parent, root }) => ({
          id,
          name: name || tags || created_at || id,
          rootId: root?.id,
          // val: Math.log10(this.getTotalDescendants(id) + 1),
          val: id === root?.id && children?.length ? 2 : children?.length ? 1 : 0.5
        })),
        links: [
          ...this.rootLinks.map(formatLink),
          ...links,
          ...filter(links, { isMain: true })
          //! (We're making main links twice as forceful as the rest, to make them attract the nodes more)
        ]
      };
      return result;
    }
    get html() {
      return renderTemplate(window.templates.tree, { data: JSON.stringify(this.graphData) });
    }
    openHtml() {
      const win = window.open();
      if (!win) {
        console.error("Failed to open new window.");
        return;
      }
      ;
      win.document.write(this.html);
    }
  };
  var tree = new Tree();
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
  mutate(window, { vovas: { tree } });
})();
