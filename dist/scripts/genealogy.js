
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
    return clips.slice(clips.findIndex((clip) => clip.id === croppedClip.id)).find((clip) => {
      return clip.metadata.tags === croppedClip.metadata.tags && areImagesEqual(clip.image_url, croppedClip.image_url);
    })?.id;
  }
  async function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
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
    return avgDiff < 10;
  }

  // src/scripts/genealogy.ts
  var Genealogy = class _Genealogy {
    constructor(rawClips = [], lastProcessedPage = -1, allPagesProcessed = false) {
      this.rawClips = rawClips;
      this.lastProcessedPage = lastProcessedPage;
      this.allPagesProcessed = allPagesProcessed;
    }
    reset(config = []) {
      Object.assign(this, new _Genealogy(...config));
      console.log("Genealogy reset. Run build() to start building it again.");
    }
    async upload() {
      const json = await uploadTextFile();
      if (!json) {
        console.log("No file selected, aborting.");
        return;
      }
      ;
      const [rawClips, lastProcessedPage, allPagesProcessed] = JSON.parse(json);
      this.reset([rawClips, lastProcessedPage, allPagesProcessed]);
    }
    download() {
      const json = JSON.stringify([this.rawClips, this.lastProcessedPage, this.allPagesProcessed]);
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
      await this.buildLinks();
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
      const clip = await window.suno.root.clips.loadClipById(id);
      this.rawClips.push(clip);
      return clip;
    }
    async rawClipById(id) {
      return this.rawClipsById[id] ??= this.rawClips.find((clip) => clip.id === id) ?? await this.loadClip(id);
    }
    links = [];
    async buildLinks() {
      console.log("Building links...");
      for (const child of this.rawClips) {
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
      console.log(`Built ${this.links.length} links.`);
    }
  };
  var genealogy = new Genealogy();
  mutate(window, { genealogy });
})();
