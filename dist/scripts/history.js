
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
      const { metadata: { concat_history } } = await window.suno.root.clips.loadClipById(id);
      if (!concat_history) {
        return result;
      }
      ;
      const [{ id: baseId, type }, { id: modifierId }] = concat_history;
      result.push({ id, baseId, modifierId, type });
      id = baseId;
    }
    ;
  }
  mutate(window, { getHistory });
})();
