(vovas = { main() {
(() => {
  // src/api.ts
  var BASE_URL = "https://studio-api.prod.suno.com/api/";
  function fetcher(pathFactory, ignore404) {
    return async (...args) => {
      const path = pathFactory(...args);
      const response = await fetch(BASE_URL + path, {
        headers: {
          authorization: `Bearer ${await window.Clerk.session.getToken()}`
        }
      });
      if (response.status === 404 && ignore404) {
        console.warn(`Could not find resource at ${path}, returning undefined`);
        return;
      }
      ;
      return await response.json();
    };
  }
  var api = {
    getClips: fetcher((page) => "feed/v2?is_liked=true&page=" + page),
    getClip: fetcher(
      (id) => "clip/" + id,
      true
    )
  };

  // src/types.ts
  var NOT_SET = Symbol("NOT_SET");
  var BRAND = Symbol("brand");

  // src/utils.ts
  function mutate(obj, partial) {
    Object.assign(obj, partial);
  }
  function $throw(messageOrError) {
    throw messageOrError instanceof Error ? messageOrError : new Error(messageOrError);
  }
  var TYPE_MARKER = Symbol("typeMarker");

  // src/scripts/history.ts
  async function getHistory(id) {
    const result = [];
    while (true) {
      const { metadata } = await api.getClip(id) ?? $throw(`Clip with id ${id} not found`);
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
}}).main();
