
window.suno = this instanceof Window ? (() => {
  throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository’s README for more information.");
})() : this;
        
(() => {
  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/genealogy.ts
  var Genealogy = class {
    rawClips = [];
    async build() {
      for (let page = 0; ; page++) {
        const { data: { clips } } = await window.suno.root.apiClient.GET("/api/feed/v2", { params: { query: {
          is_liked: true,
          page
        } } });
        if (!clips.length) {
          break;
        }
        ;
        this.rawClips.push(...clips);
      }
    }
  };
  mutate(window, { Genealogy });
})();
