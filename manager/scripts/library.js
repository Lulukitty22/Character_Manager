/**
 * library.js
 * Shared repo-backed records for spells, items, resources, tags, feats,
 * traits, classes, and races. Character files store lightweight references; this
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
    races:     { file: "races-custom.json",     label: "Races" },
  };

  const DND5E_ENDPOINTS = [
    "spells",
    "equipment",
    "magic-items",
    "feats",
    "features",
    "traits",
    "classes",
    "races",
    "subclasses",
    "proficiencies",
    "conditions",
  ];

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
      access: refObj.access || merged.access || null,
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

    syncNameRecord(character.identity?.race, "races", customChanged);
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
    const record = open5eRecord?.provider === "open5e" && open5eRecord?.collection === "spells"
      ? open5eRecord
      : Schema.normalizeOpen5eSpell(open5eRecord);
    return upsert("spells", record, "srd");
  }

  async function searchOpen5e(query) {
    const clean = String(query || "").trim();
    if (!clean) return [];

    const response = await fetch(`https://api.open5e.com/v2/search/?query=${encodeURIComponent(clean)}&limit=50`);
    if (!response.ok) throw new Error(`Open5e search failed: HTTP ${response.status}`);
    const data = await response.json();
    return (data.results || []).map(normalizeOpen5eSearchResult);
  }

  async function searchDnd5eApi(query) {
    const clean = String(query || "").trim().toLowerCase();
    if (!clean) return [];

    const endpointResults = await Promise.all(DND5E_ENDPOINTS.map(async endpoint => {
      const response = await fetch(`https://www.dnd5eapi.co/api/2014/${endpoint}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data.results || [])
        .filter(entry => entry.name?.toLowerCase().includes(clean) || entry.index?.toLowerCase().includes(clean))
        .slice(0, 10)
        .map(entry => normalizeDnd5eSearchResult(endpoint, entry));
    }));

    return endpointResults.flat().slice(0, 50);
  }

  async function importExternalResult(result) {
    if (!result) throw new Error("No import result selected.");

    if (result.provider === "open5e") {
      const detailed = await fetchExternalDetail(result).catch(() => result.raw || result);
      const record = result.collection === "spells"
        ? Schema.normalizeOpen5eSpell({ ...result.raw, ...detailed })
        : normalizeGenericExternalRecord(result, detailed);
      return upsert(record.collection, record, record.source || "external");
    }

    if (result.provider === "dnd5eapi") {
      const detailed = await fetchExternalDetail(result).catch(() => result.raw || result);
      const record = normalizeDnd5eDetail(result, detailed);
      return upsert(record.collection, record, record.source || "external");
    }

    const record = normalizeGenericExternalRecord(result, result.raw || result);
    return upsert(record.collection, record, record.source || "external");
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
      provider: "open5e",
      providerLabel: "Open5e",
      collection,
      id: `open5e-${collection}-${objectKey}`,
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
      tags: ["D&D 5e API", "SRD 2014", endpoint],
      raw: { ...raw, endpoint },
    };
  }

  function normalizeGenericExternalRecord(result, detail = {}) {
    const record = {
      ...Schema.createLibraryRecord(result.collection),
      id: result.id,
      collection: result.collection,
      name: detail.name || detail.title || result.name || "",
      tags: unique([...toArray(result.tags), ...toArray(detail.tags)]),
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
    }

    if (result.collection === "classes") {
      record.hitDie = detail.hit_die ? `d${detail.hit_die}` : "";
      record.primaryAbility = (detail.proficiency_choices || []).map(choice => choice.desc).filter(Boolean).join("; ");
    }

    if (result.collection === "races") {
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

    if (["traits", "feats", "classes", "races"].includes(result.collection)) {
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
    if (value.includes("race") || value.includes("species") || value.includes("ancestr")) return "races";
    if (value.includes("trait") || value.includes("feature") || value.includes("condition")) return "traits";
    return "traits";
  }

  function mapDnd5eEndpointToCollection(endpoint) {
    if (endpoint === "spells") return "spells";
    if (["equipment", "magic-items"].includes(endpoint)) return "items";
    if (endpoint === "feats") return "feats";
    if (["classes", "subclasses"].includes(endpoint)) return "classes";
    if (endpoint === "races") return "races";
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
      races: "Race",
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
    searchOpen5e,
    searchDnd5eApi,
    importExternalResult,
    importExternalResults,
  };

})();
