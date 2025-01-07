(() => {
  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function $throw(message) {
    throw new Error(message);
  }

  // src/manager.ts
  function getSuno() {
    return window.suno ?? $throw("`suno` object not found in `window`. Have you followed the setup instructions?");
  }

  // src/scripts/history.ts
  async function getHistory(id) {
    const result = [];
    while (true) {
      const { metadata } = await getSuno().root.clips.loadClipById(id) ?? $throw(`Clip with id ${id} not found`);
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
