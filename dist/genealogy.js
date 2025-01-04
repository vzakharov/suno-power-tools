
window.suno = this instanceof Window ? (() => {
  throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository’s README for more information.");
})() : this;
            
(() => {
  // src/utils.ts
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

  // src/scripts/genealogy.ts
  var Genealogy = class _Genealogy {
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
    reset(config = []) {
      Object.assign(this, new _Genealogy(...config));
      console.log("Genealogy reset. Run build() to start building it again.");
    }
    async loadState() {
      const json = await uploadTextFile();
      if (!json) {
        console.log("No file selected, aborting.");
        return;
      }
      ;
      const [rawClips, lastProcessedPage, allPagesProcessed] = JSON.parse(json);
      this.reset([rawClips, lastProcessedPage, allPagesProcessed]);
    }
    saveState() {
      const json = JSON.stringify(this.config);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "suno_genealogy.json";
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
        const { data: { clips } } = await window.suno.root.apiClient.GET("/api/feed/v2", {
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
      const clip = await window.suno.root.clips.loadClipById(id) ?? missingClip(id);
      this.rawClips.push(clip);
      return clip;
    }
    async rawClipById(id) {
      //! (For some reason, Suno sometimes prefixes the clip IDs in history arrays with 'm_', while the actual clip IDs don't have that prefix)
      if (id.startsWith("m_"))
        id = id.slice(2);
      //! For older (v2) generations, the referenced IDs are actually names of audio_url files, and they end with _\d+. So if the ID ends with _\d+, we need to find a clip with an audio_url including the ID.
      return this.rawClipsById[id] ??= this.rawClips.find(
        (clip) => isV2AudioFilename(id) ? clip.audio_url.includes(id) : clip.id === id
      ) ?? await this.loadClip(id);
    }
    async buildLinks() {
      console.log("Building links...");
      for (let i = 0; i < this.rawClips.length; i++) {
        const child = this.rawClips[i];
        if (i % 100 === 0) {
          console.log(`Processed ${i} clips out of ${this.rawClips.length}`);
        }
        ;
        const { metadata } = child;
        const [parentId, kind] = "history" in metadata ? [metadata.history[0].id, metadata.history[0].type] : "concat_history" in metadata ? [metadata.concat_history[1].id, "join"] : "cover_clip_id" in metadata ? [metadata.cover_clip_id, "cover"] : "upsample_clip_id" in metadata ? [metadata.upsample_clip_id, "remaster"] : "type" in metadata && metadata.type === "edit_crop" ? [await findCropBaseClipId(child, this.rawClips), "crop"] : [void 0, void 0];
        if (parentId) {
          this.links.push({
            parent: await this.rawClipById(parentId),
            child,
            kind
          });
        }
      }
      ;
      this.allLinksBuilt = true;
      console.log(`Built ${this.links.length} links.`);
    }
  };
  var gen = new Genealogy();
  function isV2AudioFilename(id) {
    return id.match(/_\d+$/);
  }
  function missingClip(id) {
    console.warn(`Clip ${id} not found, creating a missing clip.`);
    return {
      isMissing: true,
      id,
      title: "*Clip not found*",
      audio_url: `https://cdn1.suno.ai/${id}.mp3`,
      //! (This is not guaranteed to work, but who can blame us for trying?)
      image_url: "",
      metadata: { tags: "" }
    };
  }
  mutate(window, { spt: { gen } });
})();
