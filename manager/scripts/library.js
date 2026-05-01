/**
 * library.js
 * Shared repo-backed records for spells, items, resources, tags, feats,
 * traits, and classes. Character files store lightweight references; this
 * module resolves those references for editing, preview, and export.
 */

const Library = (() => {

  const COLLECTIONS = {
    spells:    { file: "spells-custom.json",    label: "Spells" },
    srdSpells: { file: "spells-srd.json",       label: "SRD Spells", collection: "spells", source: "srd" },
    items:     { file: "items-custom.json",     label: "Items" },
    resources: { file: "resources-custom.json", label: "Resources" },
    tags:      { file: "tags-custom.json",      label: "Tags" },
    feats:     { file: "feats-custom.json",     label: "Feats" },
    traits:    { file: "traits-custom.json",    label: "Traits" },
    classes:   { file: "classes-custom.json",   label: "Classes" },
  };

  const state = {
    collections: {},
    shaByKey: {},
    loaded: false,
  };

  function getCollectionKey(collection, source = "custom") {
    if (collection === "spells" && source === "srd") return "srdSpells";
    return collection;
  }

  function emptyCollection(collection) {
    return Schema.createLibraryCollection(collection);
  }

  async function loadAll() {
    const keys = Object.keys(COLLECTIONS);
    await Promise.all(keys.map(key => loadCollection(key)));
    state.loaded = true;
    return state.collections;
  }

  async function loadCollection(key) {
    const meta = COLLECTIONS[key];
    if (!meta) throw new Error(`Unknown library collection: ${key}`);
    if (state.collections[key]) return state.collections[key];

    const collectionName = meta.collection || key;
    const fallback = emptyCollection(collectionName);
    const result = await GitHub.readLibraryFile(meta.file, fallback);
    const data = normalizeCollection(result.data, collectionName);
    state.collections[key] = data;
    state.shaByKey[key] = result.sha;
    return data;
  }

  function seedCollections(collectionDataByFile = {}) {
    Object.entries(COLLECTIONS).forEach(([key, meta]) => {
      const collectionName = meta.collection || key;
      const data = collectionDataByFile[meta.file] || emptyCollection(collectionName);
      state.collections[key] = normalizeCollection(data, collectionName);
      state.shaByKey[key] = null;
    });
    state.loaded = true;
  }

  function normalizeCollection(data, collectionName) {
    const safe = data && typeof data === "object" ? data : {};
    return {
      version: safe.version || 1,
      collection: safe.collection || collectionName,
      entries: Array.isArray(safe.entries) ? safe.entries : [],
    };
  }

  function list(collection, options = {}) {
    const keys = collection === "spells"
      ? ["spells", "srdSpells"]
      : [getCollectionKey(collection, options.source || "custom")];

    return keys.flatMap(key => state.collections[key]?.entries || []);
  }

  function find(collection, ref, source = "custom") {
    if (!ref) return null;
    if (collection === "spells") {
      return list("spells").find(entry => entry.id === ref);
    }
    const key = getCollectionKey(collection, source);
    return (state.collections[key]?.entries || []).find(entry => entry.id === ref) || null;
  }

  function createReference(collection, entry, statePatch = {}) {
    return Schema.createCharacterLibraryRef(collection, entry, statePatch);
  }

  async function upsert(collection, record, source = "custom") {
    const key = getCollectionKey(collection, source || record.source || "custom");
    const data = await loadCollection(key);
    const normalized = {
      ...Schema.createLibraryRecord(collection),
      ...record,
      collection,
      source: source || record.source || "custom",
      updatedAt: new Date().toISOString(),
    };
    const index = data.entries.findIndex(entry => entry.id === normalized.id);
    if (index >= 0) data.entries[index] = { ...data.entries[index], ...normalized };
    else data.entries.push(normalized);
    await saveCollection(key);
    return normalized;
  }

  async function remove(collection, id, source = "custom") {
    const key = getCollectionKey(collection, source);
    const data = await loadCollection(key);
    data.entries = data.entries.filter(entry => entry.id !== id);
    await saveCollection(key);
  }

  async function saveCollection(key) {
    const meta = COLLECTIONS[key];
    const result = await GitHub.writeLibraryFile(meta.file, state.collections[key], state.shaByKey[key]);
    state.shaByKey[key] = result.sha;
    return result;
  }

  function resolveRef(refObj) {
    if (!refObj || refObj.source !== "library") return refObj;
    const collection = refObj.libraryCollection;
    const base = find(collection, refObj.libraryRef, refObj.librarySource);
    if (!base) return refObj;
    const merged = mergeRecord(base, refObj.overrides || {});
    return {
      ...merged,
      id: refObj.id || merged.id,
      source: "library",
      libraryCollection: collection,
      librarySource: refObj.librarySource,
      libraryRef: refObj.libraryRef,
      overrides: refObj.overrides || {},
      prepared: refObj.prepared ?? merged.prepared ?? false,
      quantity: refObj.quantity ?? merged.quantity ?? 1,
      current: refObj.current ?? merged.current ?? merged.max ?? 0,
      max: refObj.max ?? merged.max ?? 0,
      log: refObj.log || [],
    };
  }

  function mergeRecord(base, overrides) {
    return {
      ...base,
      ...overrides,
      addons: {
        ...(base.addons || {}),
        ...(overrides.addons || {}),
      },
    };
  }

  function resolveCharacterSync(character) {
    const resolved = JSON.parse(JSON.stringify(character || {}));
    resolved.spells = (resolved.spells || []).map(resolveRef);
    resolved.inventory = (resolved.inventory || []).map(resolveRef);
    resolved.customResources = (resolved.customResources || []).map(resolveRef);
    resolved.abilities = (resolved.abilities || []).map(resolveRef);
    if (resolved.dnd?.feats) {
      resolved.dnd.feats = resolved.dnd.feats.map(resolveRef);
    }
    return resolved;
  }

  async function syncCharacter(character) {
    await loadAll();
    const customChanged = new Set();

    character.spells = await syncArray(character.spells || [], "spells", customChanged, spellState);
    character.inventory = await syncArray(character.inventory || [], "items", customChanged, itemState);
    character.customResources = await syncArray(character.customResources || [], "resources", customChanged, resourceState);
    character.abilities = await syncArray(character.abilities || [], "traits", customChanged, traitState);

    if (character.dnd) {
      character.dnd.feats = await syncArray(character.dnd.feats || [], "feats", customChanged, featState);
      syncNameRecord(character.dnd.class, "classes", customChanged);
      (character.dnd.multiclass || []).forEach(entry => syncNameRecord(entry.class, "classes", customChanged));
    }

    (character.identity?.tags || []).forEach(tag => syncNameRecord(tag, "tags", customChanged));
    collectNestedTags(character).forEach(tag => syncNameRecord(tag, "tags", customChanged));

    for (const key of customChanged) {
      await saveCollection(key);
    }

    return character;
  }

  async function syncArray(entries, collection, changedKeys, stateMapper) {
    return entries.filter(Boolean).map(entry => {
      if (entry.source === "library") {
        return syncVariantIfNeeded(entry, collection, changedKeys);
      }

      const record = recordFromCharacterEntry(collection, entry);
      if (!record.name) return entry;
      upsertLocal(collection, record, changedKeys);
      return createReference(collection, record, stateMapper(entry));
    });
  }

  function syncVariantIfNeeded(entry, collection, changedKeys) {
    const overrides = entry.overrides || {};
    if (!Object.keys(overrides).length) return entry;

    const base = find(collection, entry.libraryRef, entry.librarySource);
    const characterName = document.getElementById("base-name")?.value.trim() || "Character";
    const variant = {
      ...mergeRecord(base || {}, overrides),
      id: Schema.generateId(),
      collection,
      source: "custom",
      name: `${characterName}'s ${(overrides.name || base?.name || entry.name || "Variant").replace(new RegExp(`^${escapeRegExp(characterName)}'s\\s+`, "i"), "")}`,
      variantOf: entry.libraryRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertLocal(collection, variant, changedKeys);
    return createReference(collection, variant, stateForCollection(collection, entry));
  }

  function upsertLocal(collection, record, changedKeys) {
    const key = getCollectionKey(collection, record.source || "custom");
    if (!state.collections[key]) state.collections[key] = emptyCollection(collection);
    const data = state.collections[key];
    const index = data.entries.findIndex(entry => entry.id === record.id || comparableName(entry.name) === comparableName(record.name));
    if (index >= 0) {
      record.id = data.entries[index].id;
      data.entries[index] = { ...data.entries[index], ...record, updatedAt: new Date().toISOString() };
    } else {
      data.entries.push(record);
    }
    changedKeys.add(key);
  }

  function recordFromCharacterEntry(collection, entry) {
    const record = {
      ...Schema.createLibraryRecord(collection),
      ...entry,
      id: entry.libraryRef || entry.id || Schema.generateId(),
      source: "custom",
      collection,
      updatedAt: new Date().toISOString(),
    };

    delete record.libraryCollection;
    delete record.librarySource;
    delete record.libraryRef;
    delete record.overrides;
    delete record.current;
    delete record.quantity;
    delete record.log;

    if (collection === "resources") {
      record.max = entry.max ?? 0;
      record.addons = {
        ...(record.addons || {}),
        resource: { currentIsCharacterState: true, logIsCharacterState: true },
      };
    }

    if (collection === "spells") {
      record.addons = {
        ...(record.addons || {}),
        components: entry.components || [],
        ritual: entry.addons?.ritual || { enabled: false },
        concentration: entry.addons?.concentration || { enabled: /concentration/i.test(entry.duration || "") },
      };
    }

    return record;
  }

  function syncNameRecord(name, collection, changedKeys) {
    const clean = String(name || "").trim();
    if (!clean) return;
    const record = Schema.createLibraryRecord(collection);
    record.id = comparableName(clean);
    record.name = clean;
    upsertLocal(collection, record, changedKeys);
  }

  function collectNestedTags(character) {
    return [
      ...(character.spells || []).flatMap(entry => entry.tags || []),
      ...(character.inventory || []).flatMap(entry => entry.tags || []),
      ...(character.abilities || []).flatMap(entry => entry.tags || []),
      ...(character.dnd?.feats || []).flatMap(entry => entry.tags || []),
    ].filter(Boolean);
  }

  function stateForCollection(collection, entry) {
    if (collection === "spells") return spellState(entry);
    if (collection === "items") return itemState(entry);
    if (collection === "resources") return resourceState(entry);
    if (collection === "feats") return featState(entry);
    if (collection === "traits") return traitState(entry);
    return {};
  }

  function spellState(entry) {
    return { prepared: Boolean(entry.prepared) };
  }

  function itemState(entry) {
    return { quantity: Number(entry.quantity ?? 1) || 1 };
  }

  function resourceState(entry) {
    return {
      current: Number(entry.current ?? entry.max ?? 0) || 0,
      max: Number(entry.max ?? 0) || 0,
      log: entry.log || [],
    };
  }

  function featState() {
    return {};
  }

  function traitState(entry) {
    return { active: Boolean(entry.active) };
  }

  async function searchOpen5eSpells(query) {
    const clean = String(query || "").trim();
    if (!clean) return [];

    const v2Url = `https://api.open5e.com/v2/spells/?search=${encodeURIComponent(clean)}&limit=20`;
    const v1Url = `https://api.open5e.com/v1/spells/?search=${encodeURIComponent(clean)}&limit=20`;
    const response = await fetch(v2Url).catch(() => null);
    const fallbackNeeded = !response || !response.ok;
    const data = fallbackNeeded
      ? await fetch(v1Url).then(result => result.json())
      : await response.json();

    return (data.results || []).map(Schema.normalizeOpen5eSpell);
  }

  async function importOpen5eSpell(open5eRecord) {
    const record = {
      ...Schema.normalizeOpen5eSpell(open5eRecord),
      ...open5eRecord,
      source: "srd",
    };
    return upsert("spells", record, "srd");
  }

  function comparableName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || Schema.generateId();
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return {
    COLLECTIONS,
    loadAll,
    loadCollection,
    seedCollections,
    list,
    find,
    upsert,
    remove,
    createReference,
    resolveRef,
    resolveCharacterSync,
    syncCharacter,
    searchOpen5eSpells,
    importOpen5eSpell,
  };

})();
