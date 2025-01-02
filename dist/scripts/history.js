(() => {
  // src/manager.ts
  function getSuno() {
    if ("suno" in window) {
      return window.suno;
    }
    ;
    throw new Error("Suno manager not found in window object. Make sure you have followed the steps outlined in the repository\u2019s README.");
  }

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }

  // src/scripts/history.ts
  async function getHistory(id) {
    const suno = getSuno();
    const result = [];
    while (true) {
      const { metadata: { concat_history } } = await suno.root.clips.loadClipById(id);
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
