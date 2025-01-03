
window.suno = this instanceof Window ? (() => {
  throw new Error("This function should be called at a specific breakpoint in the code. Please refer to the repository’s README for more information.");
})() : this;
            
(() => {
  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/history.ts
  async function getHistory(id) {
    const result = [];
    while (true) {
      const { metadata } = await window.suno.root.clips.loadClipById(id);
      if (!("concat_history" in metadata)) {
        return result;
      }
      ;
      const { concat_history: [
        { id: baseId, type },
        { id: modifierId }
      ] } = metadata;
      result.push({ id, baseId, modifierId, type });
      id = baseId;
    }
    ;
  }
  mutate(window, { getHistory });
})();
