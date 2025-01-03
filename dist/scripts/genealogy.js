
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
    rawClips = [];
    lastProcessedPage = -1;
    allPagesProcessed = false;
    reset() {
      Object.assign(this, new _Genealogy());
      console.log("Genealogy reset. Run build() to start building it again.");
    }
    async build() {
      if (this.allPagesProcessed) {
        throw new Error("Genealogy already built. Call reset() if you want to rebuild it.");
      }
      ;
      while (true) {
        await atLeast(1e3);
        //! to avoid rate limiting
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
  };
  var genealogy = new Genealogy();
  mutate(window, { genealogy });
})();
