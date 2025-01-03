
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
        while (true) {
          await atLeast(1e3);
          //! (to avoid rate limiting)
          const { data: { clips } } = await window.suno.root.apiClient.GET("/api/feed/v2", { params: { query: {
            is_liked: true,
            page: this.lastProcessedPage + 1
          } } });
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
      ;
    }
  };
  var genealogy = new Genealogy();
  mutate(window, { genealogy });
})();
