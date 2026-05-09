/**
 * library.js
 * Shared repo-backed records for spells, items, resources, tags, feats,
 * traits, classes, and species. Character files store lightweight references; this
 * module resolves those references for editing, preview, and export.
 */

const Library = (() => {

  const MANIFEST_FILE = "manifest.json";
  const LOAD_CONCURRENCY = 12;

  const COLLECTIONS = {
    spells:    { folder: "spells",    label: "Spells" },
    items:     { folder: "items",     label: "Items" },
    resources: { folder: "resources", label: "Resources" },
    tags:      { folder: "tags",      label: "Tags" },
    feats:     { folder: "feats",     label: "Feats" },
    traits:    { folder: "traits",    label: "Traits" },
    classes:   { folder: "classes",   label: "Classes" },
    species:   { folder: "species",   label: "Species", aliases: ["races"] },
  };

  const state = {
    collections: {},
    shaByRecord: {},
    manifest: null,
    manifestSha: null,
    lastLoadReport: null,
    loaded: false,
  };

  function getCollectionKey(collection, source = "custom") {
    return LibraryRecords?.canonicalCollection?.(collection) || collection;
  }

  function emptyCollection(collection) {
    return Schema.createLibraryCollection(collection);
  }

  async function loadAll(options = {}) {
    if (state.loaded && !options.force) {
      reportProgress(options, {
        phase: "complete",
        message: "Library already loaded.",
        progress: 1,
        loadedRecords: countLoadedRecords(),
        totalRecords: countLoadedRecords(),
        errors: [],
      });
      return state.collections;
    }

    const keys = Object.keys(COLLECTIONS);
    const errors = [];
    const startedAt = Date.now();

    reportProgress(options, {
      phase: "manifest",
      message: "Loading library manifest...",
      progress: 0.04,
      loadedRecords: 0,
      totalRecords: 0,
      errors,
    });

    const manifest = await loadManifest(options);
    const totalRecords = countManifestRecords(manifest);
    let loadedRecords = 0;

    reportProgress(options, {
      phase: "records",
      message: totalRecords ? `Loading library records: 0/${totalRecords}` : "Loading library collections...",
      progress: 0.08,
      loadedRecords,
      totalRecords,
      errors,
    });

    await Promise.all(keys.map(key => loadCollection(key, {
      ...options,
      onRecordLoaded: (detail) => {
        loadedRecords += 1;
        const recordProgress = totalRecords ? loadedRecords / totalRecords : 1;
        reportProgress(options, {
          phase: "records",
          message: `Loading library records: ${loadedRecords}/${totalRecords || "?"}`,
          progress: 0.08 + (recordProgress * 0.84),
          loadedRecords,
          totalRecords,
          collection: detail.collection,
          path: detail.path,
          errors,
        });
      },
      onRecordError: (detail) => {
        loadedRecords += 1;
        errors.push(detail);
        const recordProgress = totalRecords ? loadedRecords / totalRecords : 1;
        reportProgress(options, {
          phase: "records",
          message: `Loading library records: ${loadedRecords}/${totalRecords || "?"} (${errors.length} issue${errors.length === 1 ? "" : "s"})`,
          progress: 0.08 + (recordProgress * 0.84),
          loadedRecords,
          totalRecords,
          collection: detail.collection,
          path: detail.path,
          errors,
        });
      },
    })));

    state.lastLoadReport = {
      loadedRecords,
      totalRecords,
      errors,
      durationMs: Date.now() - startedAt,
    };
    state.loaded = true;
    reportProgress(options, {
      phase: "complete",
      message: errors.length
        ? `Library loaded with ${errors.length} issue${errors.length === 1 ? "" : "s"}.`
        : `Library loaded: ${loadedRecords}/${totalRecords || loadedRecords} records.`,
      progress: 1,
      loadedRecords,
      totalRecords,
      errors,
      durationMs: state.lastLoadReport.durationMs,
    });
    return state.collections;
  }

  async function loadCollection(key, options = {}) {
    const meta = COLLECTIONS[key];
    if (!meta) throw new Error(`Unknown library collection: ${key}`);
    if (state.collections[key] && !options.force) return state.collections[key];

    const collectionName = meta.collection || key;
    const fallback = emptyCollection(collectionName);
    const manifest = state.manifest || await loadManifest();
    const manifestFiles = (manifest.collections?.[key] || [])
      .map(entry => ({ path: entry.path, sha: entry.sha || null }))
      .filter(entry => entry.path);
    const files = manifestFiles.length
      ? manifestFiles
      : await GitHub.listLibraryFolder(meta.folder);
    const records = (await mapWithConcurrency(files, options.concurrency || LOAD_CONCURRENCY, async (file) => {
      try {
        const result = await GitHub.readJsonFile(file.path, null);
        state.shaByRecord[file.path] = result.sha;
        options.onRecordLoaded?.({ collection: key, path: file.path });
        return result.data;
      } catch (error) {
        options.onRecordError?.({
          collection: key,
          path: file.path,
          message: error.message || String(error),
        });
        return null;
      }
    })).filter(Boolean);
    const data = normalizeCollection({ ...fallback, entries: records }, collectionName);
    state.collections[key] = data;
    return data;
  }

  async function loadManifest(options = {}) {
    if (state.manifest && !options.force) return state.manifest;
    const result = await GitHub.readLibraryFile(MANIFEST_FILE, createEmptyManifest());
    state.manifest = normalizeManifest(result.data);
    state.manifestSha = result.sha;
    return state.manifest;
  }

  function seedCollections(collectionDataByFile = {}) {
    Object.entries(COLLECTIONS).forEach(([key, meta]) => {
      const collectionName = meta.collection || key;
      const data = collectionDataByFile[meta.folder] || collectionDataByFile[key] || emptyCollection(collectionName);
      state.collections[key] = normalizeCollection(data, collectionName);
    });
    state.loaded = true;
  }

  function createEmptyManifest() {
    return {
      version: 2,
      schemaVersion: LibraryRecords?.SCHEMA_VERSION || 1,
      collections: Object.keys(COLLECTIONS).reduce((map, key) => {
        map[key] = [];
        return map;
      }, {}),
    };
  }

  function normalizeManifest(data = {}) {
    const manifest = createEmptyManifest();
    Object.entries(data.collections || {}).forEach(([key, entries]) => {
      const canonicalKey = getCollectionKey(key);
      if (!COLLECTIONS[canonicalKey]) return;
      manifest.collections[canonicalKey] = [
        ...(manifest.collections[canonicalKey] || []),
        ...(Array.isArray(entries) ? entries.filter(entry => entry?.path) : []),
      ];
    });
    return manifest;
  }

  function countManifestRecords(manifest = {}) {
    return Object.values(manifest.collections || {}).reduce((total, entries) => {
      return total + (Array.isArray(entries) ? entries.filter(entry => entry?.path).length : 0);
    }, 0);
  }

  function countLoadedRecords() {
    return Object.values(state.collections || {}).reduce((total, collection) => {
      return total + (Array.isArray(collection?.entries) ? collection.entries.length : 0);
    }, 0);
  }

  function reportProgress(options, detail) {
    const payload = {
      source: "library",
      progress: 0,
      loadedRecords: 0,
      totalRecords: 0,
      errors: [],
      ...detail,
    };
    options.onProgress?.(payload);
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("library-progress", { detail: payload }));
    }
  }

  async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(limit || LOAD_CONCURRENCY, items.length || 1));
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }));
    return results;
  }

  function normalizeCollection(data, collectionName) {
    const safe = data && typeof data === "object" ? data : {};
    return {
      version: safe.version || 1,
      collection: safe.collection || collectionName,
      entries: (Array.isArray(safe.entries) ? safe.entries : [])
        .map(entry => LibraryRecords.normalizeRecord(entry, collectionName)),
    };
  }

  function list(collection, options = {}) {
    const keys = [getCollectionKey(collection, options.source || "custom")];

    return keys.flatMap(key => state.collections[key]?.entries || [])
      .map(entry => LibraryRecords.toRuntimeRecord(entry, getCollectionKey(collection)));
  }

  function find(collection, ref, source = "custom") {
    if (!ref) return null;
    const key = getCollectionKey(collection, source);
    const candidates = referenceCandidates(key, ref);
    const record = (state.collections[key]?.entries || []).find(entry => candidates.includes(entry.id)) || null;
    return record ? LibraryRecords.toRuntimeRecord(record, key) : null;
  }

  function referenceCandidates(collection, ref) {
    const clean = String(ref || "").trim();
    if (!clean) return [];
    const canonical = getCollectionKey(collection);
    const prefix = `${canonical}.`;
    const candidates = [clean];
    if (!clean.startsWith(prefix)) candidates.push(`${prefix}${clean}`);
    else candidates.push(clean.slice(prefix.length));
    return [...new Set(candidates)];
  }

  function createReference(collection, entry, statePatch = {}) {
    return Schema.createCharacterLibraryRef(collection, entry, statePatch);
  }

  async function upsert(collection, record, source = "custom") {
    const key = getCollectionKey(collection, source || record.source || "custom");
    const data = await loadCollection(key);
    const normalized = LibraryRecords.normalizeRecord(record, key);
    const index = data.entries.findIndex(entry => entry.id === normalized.id);
    if (index >= 0) data.entries[index] = { ...data.entries[index], ...normalized };
    else data.entries.push(normalized);
    await saveRecord(key, normalized);
    return normalized;
  }

  async function remove(collection, id, source = "custom") {
    const key = getCollectionKey(collection, source);
    const data = await loadCollection(key);
    const record = data.entries.find(entry => entry.id === id);
    data.entries = data.entries.filter(entry => entry.id !== id);
    if (record) await deleteRecord(key, record);
  }

  async function saveCollection(key) {
    const meta = COLLECTIONS[key];
    const data = state.collections[key] || emptyCollection(key);
    const results = [];
    for (const record of data.entries || []) {
      results.push(await saveRecord(key, record));
    }
    return results;
  }

  async function saveRecord(key, record) {
    const path = libraryRecordPath(key, record);
    const sha = state.shaByRecord[path] || null;
    try {
      const result = await GitHub.writeJsonFile(path, record, sha, `Update ${path}`);
      state.shaByRecord[path] = result.sha;
      await upsertManifestEntry(key, record, path, result.sha);
      await upsertIndexEntries(record, path);
      return result;
    } catch (error) {
      if (!isGitHubConflict(error)) throw error;
      const latest = await GitHub.readJsonFile(path, null).catch(() => ({ sha: null }));
      state.shaByRecord[path] = latest.sha || null;
      const result = await GitHub.writeJsonFile(path, record, state.shaByRecord[path], `Update ${path}`);
      state.shaByRecord[path] = result.sha;
      await upsertManifestEntry(key, record, path, result.sha);
      await upsertIndexEntries(record, path);
      return result;
    }
  }

  async function deleteRecord(key, record) {
    const path = libraryRecordPath(key, record);
    delete state.shaByRecord[path];
    if (typeof GitHub.deleteCharacterFile === "function") {
      const latest = await GitHub.readJsonFile(path, null).catch(() => null);
      if (latest?.sha) await GitHub.deleteCharacterFile(path, latest.sha);
    }
    await removeManifestEntry(key, path);
    await removeIndexEntries(record, path);
  }

  async function upsertManifestEntry(key, record, path, sha = "") {
    const manifest = state.manifest || await loadManifest();
    const entries = manifest.collections[key] || [];
    const entry = {
      ...LibraryRecords.manifestEntry(record, path, sha),
      updatedAt: new Date().toISOString(),
    };
    const index = entries.findIndex(item => item.path === path || item.id === record.id);
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
    manifest.collections[key] = entries.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    await saveManifest();
  }

  async function removeManifestEntry(key, path) {
    const manifest = state.manifest || await loadManifest();
    manifest.collections[key] = (manifest.collections[key] || []).filter(entry => entry.path !== path);
    await saveManifest();
  }

  async function saveManifest() {
    const write = async () => {
      const result = await GitHub.writeLibraryFile(MANIFEST_FILE, state.manifest || createEmptyManifest(), state.manifestSha);
      state.manifestSha = result.sha;
      return result;
    };
    try {
      return await write();
    } catch (error) {
      if (!isGitHubConflict(error)) throw error;
      const latest = await GitHub.readLibraryFile(MANIFEST_FILE, createEmptyManifest());
      const local = state.manifest || createEmptyManifest();
      state.manifest = mergeManifests(normalizeManifest(latest.data), local);
      state.manifestSha = latest.sha;
      return write();
    }
  }

  async function upsertIndexEntries(record, recordPath) {
    const dirs = indexDirsForPath(recordPath);
    await upsertRootIndex(dirs[0]);
    for (const dir of dirs) {
      const indexPath = `${dir}/index.json`;
      const index = await readIndex(indexPath, dir);
      const entry = {
        id: record.id,
        name: record.name || "",
        collections: record.collections || [],
        tags: record.tags || [],
        path: recordPath,
      };
      const entryIndex = index.entries.findIndex(item => item.id === record.id || item.path === recordPath);
      if (entryIndex >= 0) index.entries[entryIndex] = entry;
      else index.entries.push(entry);
      index.entries.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
      addChildDirectories(index, dir, dirs);
      await writeIndex(indexPath, index);
    }
  }

  async function removeIndexEntries(record, recordPath) {
    const dirs = indexDirsForPath(recordPath);
    for (const dir of dirs) {
      const indexPath = `${dir}/index.json`;
      const index = await readIndex(indexPath, dir);
      index.entries = index.entries.filter(item => item.id !== record.id && item.path !== recordPath);
      await writeIndex(indexPath, index);
    }
  }

  async function upsertRootIndex(firstDir) {
    const index = await readIndex("library/index.json", "library");
    if (firstDir && !index.directories.some(entry => entry.path === `${firstDir}/index.json`)) {
      index.directories.push({
        name: titleCase(firstDir.replace(/^library\//, "")),
        path: `${firstDir}/index.json`,
      });
      index.directories.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      await writeIndex("library/index.json", index);
    }
  }

  async function readIndex(indexPath, dir) {
    const fallback = {
      schemaVersion: 1,
      id: `index.${dir.replace(/^library\/?/, "").replace(/\//g, ".") || "library"}`,
      name: titleCase(dir.split("/").pop() || "Library"),
      path: indexPath,
      directories: [],
      entries: [],
    };
    const result = await GitHub.readJsonFile(indexPath, fallback).catch(() => ({ data: fallback, sha: null }));
    state.shaByRecord[indexPath] = result.sha || state.shaByRecord[indexPath] || null;
    return {
      ...fallback,
      ...(result.data || {}),
      directories: Array.isArray(result.data?.directories) ? result.data.directories : [],
      entries: Array.isArray(result.data?.entries) ? result.data.entries : [],
    };
  }

  async function writeIndex(indexPath, index) {
    const result = await GitHub.writeJsonFile(indexPath, index, state.shaByRecord[indexPath] || null, `Update ${indexPath}`);
    state.shaByRecord[indexPath] = result.sha;
    return result;
  }

  function addChildDirectories(index, dir, dirs) {
    const depth = dir.split("/").length;
    dirs
      .filter(other => other.startsWith(`${dir}/`) && other.split("/").length === depth + 1)
      .forEach(child => {
        const childPath = `${child}/index.json`;
        if (index.directories.some(entry => entry.path === childPath)) return;
        index.directories.push({
          name: titleCase(child.split("/").pop() || ""),
          path: childPath,
        });
      });
    index.directories.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function indexDirsForPath(recordPath) {
    const parts = String(recordPath || "").split("/").filter(Boolean);
    parts.pop();
    const dirs = [];
    for (let index = 1; index <= parts.length; index += 1) {
      dirs.push(parts.slice(0, index).join("/"));
    }
    return dirs.filter(dir => dir && dir !== "library");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function mergeManifests(base, overlay) {
    const merged = createEmptyManifest();
    Object.keys(COLLECTIONS).forEach(key => {
      const byPath = new Map();
      (base.collections[key] || []).forEach(entry => byPath.set(entry.path, entry));
      (overlay.collections[key] || []).forEach(entry => byPath.set(entry.path, entry));
      merged.collections[key] = Array.from(byPath.values()).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    });
    return merged;
  }

  function libraryRecordPath(collection, record = {}) {
    return LibraryRecords.recordPath(record, collection);
  }

  function isGitHubConflict(error) {
    return /409|does not match|sha/i.test(String(error?.message || ""));
  }

  function resolveRef(refObj) {
    if (!refObj || refObj.source !== "library") return refObj;
    const collection = refObj.libraryCollection;
    const base = find(collection, refObj.libraryRef, refObj.librarySource);
    if (!base) {
      return {
        ...refObj,
        name: refObj.name || refObj.overrides?.name || `(Missing ${collection || "library"} record)`,
        description: refObj.description || `Could not resolve library reference "${refObj.libraryRef || ""}".`,
        tags: [...(refObj.tags || []), "missing-library-ref"],
        addons: {
          ...(refObj.addons || {}),
          mechanics: [
            ...(refObj.addons?.mechanics || []),
            {
              label: "Missing Ref",
              value: refObj.libraryRef || "",
              kind: "negative",
              description: "This character points at a library record that was not loaded or no longer exists.",
            },
          ],
        },
      };
    }
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
      access: refObj.access || merged.access || null,
      active: refObj.active ?? merged.active ?? true,
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
    const characterName = character.identity?.name?.trim() || "Character";

    character.spells = await syncArray(character.spells || [], "spells", customChanged, spellState, characterName);
    character.inventory = await syncArray(character.inventory || [], "items", customChanged, itemState, characterName);
    character.customResources = await syncArray(character.customResources || [], "resources", customChanged, resourceState, characterName);
    character.abilities = await syncArray(character.abilities || [], "traits", customChanged, traitState, characterName);

    if (character.dnd) {
      character.dnd.feats = await syncArray(character.dnd.feats || [], "feats", customChanged, featState, characterName);
      syncNameRecord(character.dnd.class, "classes", customChanged);
      (character.dnd.multiclass || []).forEach(entry => syncNameRecord(entry.class, "classes", customChanged));
    }

    syncNameRecord(character.identity?.race, "species", customChanged);
    (character.identity?.tags || []).forEach(tag => syncNameRecord(tag, "tags", customChanged));
    collectNestedTags(character).forEach(tag => syncNameRecord(tag, "tags", customChanged));

    for (const key of customChanged) {
      await saveCollection(key);
    }

    return character;
  }

  async function syncArray(entries, collection, changedKeys, stateMapper, characterName) {
    return entries.filter(Boolean).map(entry => {
      if (entry.source === "library") {
        return syncVariantIfNeeded(entry, collection, changedKeys, characterName);
      }

      const record = recordFromCharacterEntry(collection, entry);
      if (!record.name) return entry;
      upsertLocal(collection, record, changedKeys);
      return createReference(collection, record, stateMapper(entry));
    });
  }

  function syncVariantIfNeeded(entry, collection, changedKeys, characterName) {
    const overrides = entry.overrides || {};
    if (!Object.keys(overrides).length) return entry;

    const base = find(collection, entry.libraryRef, entry.librarySource);
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
    delete record.active;
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
    return {
      quantity: Number(entry.quantity ?? 1) || 1,
      active: entry.active !== false,
    };
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

    const v2Url = `https://api.open5e.com/v2/spells/?name__icontains=${encodeURIComponent(clean)}&limit=20`;
    const v1Url = `https://api.open5e.com/v1/spells/?search=${encodeURIComponent(clean)}&limit=20`;
    const response = await fetch(v2Url).catch(() => null);
    const fallbackNeeded = !response || !response.ok;
    let data = fallbackNeeded
      ? await fetch(v1Url).then(result => result.json())
      : await response.json();

    if (!fallbackNeeded && Array.isArray(data.results) && data.results.length === 0) {
      data = await fetch(v1Url).then(result => result.json());
    }

    return (data.results || []).map(Schema.normalizeOpen5eSpell);
  }

  async function importOpen5eSpell(open5eRecord) {
    const result = open5eRecord?.provider ? open5eRecord : {
      provider: "open5eapi",
      collection: "spells",
      name: open5eRecord?.name || "",
      raw: open5eRecord,
    };
    const record = Open5eApiImporter.toRecord(result, open5eRecord);
    return upsert("spells", record, "external");
  }

  async function searchOpen5e(query) {
    return Open5eApiImporter.search(query);
  }

  async function searchDnd5eApi(query) {
    return Dnd5eApiImporter.search(query);
  }

  async function importExternalResult(result) {
    if (!result) throw new Error("No import result selected.");

    if (result.provider === "open5eapi" || result.provider === "open5e") {
      const detailed = await Open5eApiImporter.detail(result).catch(() => result.raw || result);
      const record = Open5eApiImporter.toRecord({ ...result, provider: "open5eapi" }, detailed);
      return upsert(record.collections?.[0] || result.collection, record, "external");
    }

    if (result.provider === "dnd5eapi") {
      const detailed = await Dnd5eApiImporter.detail(result).catch(() => result.raw || result);
      const record = Dnd5eApiImporter.toRecord(result, detailed);
      return upsert(record.collections?.[0] || result.collection, record, "external");
    }

    const record = normalizeGenericExternalRecord(result, result.raw || result);
    return upsert(record.collections?.[0] || result.collection, record, "external");
  }

  async function importExternalResults(results = []) {
    const imported = [];
    for (const result of results) {
      imported.push(await importExternalResult(result));
    }
    return imported;
  }

  async function fetchExternalDetail(result) {
    if (!result.detailUrl) return result.raw || result;
    const response = await fetch(result.detailUrl);
    if (!response.ok) throw new Error(`Detail fetch failed: HTTP ${response.status}`);
    return response.json();
  }

  function normalizeOpen5eSearchResult(raw = {}) {
    const route = raw.route || raw.resource_type || raw.type || raw.model || "";
    const collection = mapOpen5eTypeToCollection(route, raw);
    const document = raw.document || {};
    const documentKey = document.key || document.slug || raw.document_slug || raw.document__slug || "";
    const documentTitle = document.display_name || document.title || document.name || raw.document_title || raw.document__title || "";
    const subsource = document.publisher?.name || raw.source || raw.publisher || raw.document_source || raw.category || "";
    const objectName = raw.object_name || raw.name || raw.title || "";
    const objectKey = raw.object_pk || raw.key || raw.slug || comparableName(objectName);
    const routePath = String(route || "").replace(/^\/+|\/+$/g, "");

    return {
      provider: "open5eapi",
      providerLabel: "Open5e",
      collection,
      id: `open5eapi-${collection}-${objectKey}`,
      name: objectName || "(Unnamed)",
      typeLabel: raw.object_model || labelForCollection(collection),
      sourceLabel: [documentTitle || documentKey || "Open5e", subsource].filter(Boolean).join(" / "),
      detailUrl: raw.api_url || raw.url || raw.resource_uri || (routePath && objectKey ? `https://api.open5e.com/${routePath}/${objectKey}/` : ""),
      tags: ["Open5e", documentTitle || documentKey, subsource].filter(Boolean),
      raw,
    };
  }

  function normalizeDnd5eSearchResult(endpoint, raw = {}) {
    const collection = mapDnd5eEndpointToCollection(endpoint);
    return {
      provider: "dnd5eapi",
      providerLabel: "D&D 5e API",
      collection,
      id: `dnd5eapi-${endpoint}-${raw.index || comparableName(raw.name)}`,
      name: raw.name || raw.index || "(Unnamed)",
      typeLabel: endpoint.replace(/-/g, " "),
      sourceLabel: "D&D 5e SRD 2014",
      detailUrl: raw.url ? `https://www.dnd5eapi.co${raw.url}` : "",
      tags: normalizeImportTags(["D&D 5e API", "SRD 2014", endpoint, raw.index]),
      raw: { ...raw, endpoint },
    };
  }

  function normalizeGenericExternalRecord(result, detail = {}) {
    const record = {
      ...Schema.createLibraryRecord(result.collection),
      id: result.id,
      collection: result.collection,
      name: detail.name || detail.title || result.name || "",
      tags: normalizeImportTags([...toArray(result.tags), ...toArray(detail.tags), ...detailTags(detail)]),
      source: result.collection === "spells" ? "srd" : "external",
      provider: result.provider,
      providerId: detail.key || detail.slug || detail.index || result.id,
      description: normalizeDescription(detail.desc || detail.description || detail.text || result.raw?.highlighted || ""),
      addons: {
        mechanics: genericMechanicsForImport(result, detail),
        sourceDocument: {
          provider: result.provider,
          title: result.sourceLabel || "",
          type: result.typeLabel || "",
          detailUrl: result.detailUrl || "",
        },
        rawImport: detail,
      },
    };

    if (result.collection === "items") {
      record.type = detail.equipment_category?.name || detail.gear_category?.name || detail.rarity?.name || "misc";
      record.weight = detail.weight ?? null;
      record.attuned = Boolean(detail.requires_attunement);
      record.addons.equipment = {
        slot: detail.equipment_category?.name || detail.gear_category?.name || "",
        rarity: detail.rarity?.name || "",
      };
      record.addons = {
        ...(record.addons || {}),
        ...inferImportedItemAddons(detail, result),
      };
    }

    if (result.collection === "classes") {
      record.hitDie = detail.hit_die ? `d${detail.hit_die}` : "";
      record.primaryAbility = (detail.proficiency_choices || []).map(choice => choice.desc).filter(Boolean).join("; ");
    }

    if (result.collection === "species") {
      record.speed = { walk: detail.speed || 30 };
      record.addons.stats = normalizeAbilityBonuses(detail.ability_bonuses || []);
      record.addons.traits = (detail.traits || []).map(trait => trait.name || trait.index).filter(Boolean);
    }

    return record;
  }

  function normalizeDnd5eDetail(result, detail = {}) {
    if (result.collection === "spells") {
      return normalizeDnd5eSpell(result, detail);
    }
    return normalizeGenericExternalRecord(result, detail);
  }

  function normalizeDnd5eSpell(result, detail = {}) {
    const record = Schema.createLibraryRecord("spells");
    const components = Array.isArray(detail.components) ? detail.components : [];
    return {
      ...record,
      id: result.id,
      source: "srd",
      provider: "dnd5eapi",
      providerId: detail.index || result.id,
      name: detail.name || result.name || "",
      level: Number(detail.level || 0) || 0,
      school: detail.school?.name || "",
      castingTime: detail.casting_time || "",
      range: detail.range || "",
      components,
      duration: detail.duration || "",
      description: normalizeDescription(detail.desc || ""),
      tags: unique([...(result.tags || []), detail.school?.name].filter(Boolean)),
      addons: {
        mechanics: buildSpellMechanics({
          castingTime: detail.casting_time || "",
          range: detail.range || "",
          components,
          duration: detail.duration || "",
          ritual: Boolean(detail.ritual),
          concentration: Boolean(detail.concentration) || /concentration/i.test(detail.duration || ""),
          damageRoll: detail.damage?.damage_at_slot_level
            ? Object.values(detail.damage.damage_at_slot_level)[0]
            : "",
          damageTypes: detail.damage?.damage_type?.name ? [detail.damage.damage_type.name] : [],
          savingThrow: detail.dc?.dc_type?.name || "",
          areaShape: detail.area_of_effect?.type || "",
          areaSize: detail.area_of_effect?.size || null,
          areaUnit: detail.area_of_effect?.type ? "ft" : "",
        }),
        components,
        ritual: { enabled: Boolean(detail.ritual) },
        concentration: { enabled: Boolean(detail.concentration) || /concentration/i.test(detail.duration || "") },
        damage: detail.damage || {},
        area: detail.area_of_effect || {},
        sourceDocument: {
          provider: "dnd5eapi",
          title: "D&D 5e SRD 2014",
          type: "spells",
          detailUrl: result.detailUrl || "",
        },
        rawImport: detail,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  function genericMechanicsForImport(result, detail = {}) {
    const mechanics = [];

    if (result.collection === "items") {
      const type = detail.equipment_category?.name || detail.gear_category?.name || detail.rarity?.name || "";
      if (type) mechanics.push({ label: "Type", value: type, kind: "neutral" });
      if (detail.weight != null) mechanics.push({ label: "Weight", value: detail.weight, kind: "neutral" });
      if (detail.rarity?.name) mechanics.push({ label: "Rarity", value: detail.rarity.name, kind: "positive" });
      if (detail.requires_attunement) {
        mechanics.push({
          label: "Attuned",
          kind: "requirement",
          description: "Requires attunement for its full effects.",
        });
      }
      if (isCursedImport(detail)) {
        mechanics.push({
          label: "Cursed",
          kind: "curse",
          description: "Imported text appears to describe a cursed or harmful item. Review before use.",
        });
      }
    }

    if (["traits", "feats", "classes", "species"].includes(result.collection)) {
      if (result.typeLabel) mechanics.push({ label: "Type", value: result.typeLabel, kind: "neutral" });
      if (result.sourceLabel) mechanics.push({ label: "Source", value: result.sourceLabel, kind: "neutral" });
    }

    return mechanics;
  }

  function buildSpellMechanics(config = {}) {
    const components = Array.isArray(config.components) ? config.components.join(", ") : config.components || "";
    const damageTypes = Array.isArray(config.damageTypes) ? config.damageTypes.join(", ") : config.damageTypes || "";
    return [
      config.castingTime ? { label: "Cast", value: config.castingTime, kind: "action" } : null,
      config.range ? { label: "Range", value: config.range, kind: "range" } : null,
      components ? {
        label: "Components",
        value: components,
        kind: "component",
        description: "Spell components required to cast this spell.",
      } : null,
      config.duration ? { label: "Duration", value: config.duration, kind: "duration" } : null,
      config.ritual ? {
        label: "Ritual",
        kind: "positive",
        description: "Can be cast as a ritual if the caster has the right feature or permission.",
      } : null,
      config.concentration ? {
        label: "Concentration",
        kind: "requirement",
        description: "Requires concentration; taking damage or losing focus can end the spell.",
      } : null,
      config.damageRoll ? {
        label: "Damage",
        value: [config.damageRoll, damageTypes].filter(Boolean).join(" "),
        kind: "damage",
      } : null,
      config.savingThrow ? { label: "Save", value: config.savingThrow, kind: "requirement" } : null,
      config.areaShape || config.areaSize ? {
        label: "Area",
        value: [config.areaSize, config.areaUnit, config.areaShape].filter(Boolean).join(" "),
        kind: "range",
      } : null,
    ].filter(Boolean);
  }

  function isCursedImport(detail = {}) {
    const text = normalizeDescription([
      detail.name,
      detail.desc,
      detail.description,
      detail.text,
    ].flat().filter(Boolean).join(" "));
    return /\bcurse[ds]?\b|\bcursed\b/i.test(text);
  }

  function mapOpen5eTypeToCollection(type, raw = {}) {
    const value = String(type || raw.route || raw.category || "").toLowerCase();
    if (value.includes("spell")) return "spells";
    if (value.includes("item") || value.includes("equipment") || value.includes("weapon") || value.includes("armor")) return "items";
    if (value.includes("feat")) return "feats";
    if (value.includes("class") || value.includes("subclass")) return "classes";
    if (value.includes("race") || value.includes("species") || value.includes("ancestr")) return "species";
    if (value.includes("trait") || value.includes("feature") || value.includes("condition")) return "traits";
    return "traits";
  }

  function mapDnd5eEndpointToCollection(endpoint) {
    if (endpoint === "spells") return "spells";
    if (["equipment", "magic-items"].includes(endpoint)) return "items";
    if (endpoint === "feats") return "feats";
    if (["classes", "subclasses"].includes(endpoint)) return "classes";
    if (endpoint === "races") return "species";
    if (["traits", "features", "conditions", "proficiencies"].includes(endpoint)) return "traits";
    return "traits";
  }

  function labelForCollection(collection) {
    const labels = {
      spells: "Spell",
      items: "Item",
      resources: "Resource",
      tags: "Tag",
      feats: "Feat",
      traits: "Trait",
      classes: "Class",
      species: "Species",
    };
    return labels[collection] || collection;
  }

  function normalizeDescription(value) {
    if (Array.isArray(value)) return value.join("\n\n");
    return String(value || "").replace(/<[^>]+>/g, "");
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return [value];
  }

  function normalizeAbilityBonuses(bonuses = []) {
    return bonuses.reduce((stats, bonus) => {
      const ability = String(bonus.ability_score?.index || bonus.ability_score?.name || "").toLowerCase().slice(0, 3);
      const key = ability === "con" ? "con"
        : ability === "dex" ? "dex"
        : ability === "str" ? "str"
        : ability === "int" ? "int"
        : ability === "wis" ? "wis"
        : ability === "cha" ? "cha"
        : "";
      if (key) stats[key] = Number(bonus.bonus || 0);
      return stats;
    }, {});
  }

  function inferImportedItemAddons(detail = {}, result = {}) {
    const text = normalizeDescription([
      detail.name,
      detail.desc,
      detail.description,
      detail.text,
    ].flat().filter(Boolean).join(" "));
    const addons = {};
    const healMatch = text.match(/regain[s]?\s+(\d+d\d+(?:\s*\+\s*\d+)?)\s+hit points/i);
    const tempHpMatch = text.match(/gain[s]?\s+(\d+)\s+temporary hit points?/i);

    if (/potion of healing/i.test(detail.name || result.name || "") || healMatch) {
      addons.healing = {
        dice: healMatch?.[1] || "2d4 + 2",
      };
      addons.actions = [{
        label: "Drink",
        consumeQuantity: true,
        effects: {
          heal: {
            dice: healMatch?.[1] || "2d4 + 2",
          },
        },
        description: "Consume the potion and regain hit points.",
      }];
    }

    if (tempHpMatch) {
      addons.effects = {
        ...(addons.effects || {}),
        hp: {
          flatBonus: 0,
          perLevelBonus: 0,
          tempHp: Number(tempHpMatch[1] || 0),
        },
      };
    }

    return addons;
  }

  function detailTags(detail = {}) {
    return [
      detail.equipment_category?.index ? `equipment-categories/${detail.equipment_category.index}` : "",
      detail.equipment_category?.name || "",
      detail.gear_category?.index ? `gear-categories/${detail.gear_category.index}` : "",
      detail.rarity?.name ? `rarity/${comparableName(detail.rarity.name)}` : "",
      detail.rarity?.name || "",
    ].filter(Boolean);
  }

  function normalizeImportTags(tags = []) {
    return unique(tags
      .flatMap(tag => {
        const clean = String(tag || "").trim();
        if (!clean) return [];
        const slug = comparableName(clean);
        return clean.includes("/") || clean === slug ? [clean] : [clean, slug];
      })
      .filter(Boolean));
  }

  function isGenericDndPotionTable(result = {}) {
    return result.provider === "dnd5eapi"
      && result.raw?.endpoint === "magic-items"
      && result.raw?.index === "potion-of-healing";
  }

  function dedupeSearchResults(results = []) {
    const byKey = new Map();
    results.forEach(result => {
      const key = [
        result.provider,
        result.collection,
        String(result.name || "").trim().toLowerCase(),
      ].join("|");
      const previous = byKey.get(key);
      if (!previous || searchSpecificity(result) > searchSpecificity(previous)) byKey.set(key, result);
    });
    return Array.from(byKey.values());
  }

  function searchSpecificity(result = {}) {
    let score = 0;
    const id = String(result.id || result.raw?.index || "").toLowerCase();
    if (/common|greater|superior|supreme|rare|very-rare|uncommon/.test(id)) score += 10;
    if (!/potion-of-healing$/.test(id)) score += 2;
    if (result.detailUrl) score += 1;
    return score;
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
    MANIFEST_FILE,
    loadAll,
    loadCollection,
    loadManifest,
    seedCollections,
    getLastLoadReport: () => state.lastLoadReport,
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
    searchOpen5e,
    searchDnd5eApi,
    fetchExternalDetail,
    importExternalResult,
    importExternalResults,
  };

})();
