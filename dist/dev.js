(vovas = { main() {
(() => {
  // src/lodashish.ts
  function isFunction(value) {
    return typeof value === "function";
  }

  // src/types.ts
  var NOT_SET = Symbol("NOT_SET");
  var BRAND = Symbol("brand");
  function infer(inferable, value) {
    return isFunction(inferable) ? inferable(value) : inferable;
  }

  // src/utils.ts
  function getOrSet(map, key, defaultValue) {
    if (map.has(key)) {
      return map.get(key);
    }
    ;
    const value = infer(defaultValue, key);
    map.set(key, value);
    return value;
  }
  function WeakBiMap() {
    const nodeRelatives = /* @__PURE__ */ new WeakMap();
    function self(...args) {
      return updateNodeRelations(...args);
    }
    ;
    function updateNodeRelations(node, relative, remove) {
      const relatives = getOrSet(nodeRelatives, node, /* @__PURE__ */ new Set());
      if (relative === null) {
        relatives.forEach(
          (relative2) => updateNodeRelations(relative2, node, null)
        );
      } else if (relative)
        [
          [relatives, relative],
          [getOrSet(nodeRelatives, relative, /* @__PURE__ */ new Set()), node]
        ].forEach(
          ([relatives2, relative2]) => (remove === null ? relatives2.delete : relatives2.add)(relative2)
        );
      return [...relatives];
    }
    ;
    return self;
  }
  var TYPE_MARKER = Symbol("typeMarker");

  // src/scripts/dev.ts
  console.log(WeakBiMap);
})();
}}).main();
