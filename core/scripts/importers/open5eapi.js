/**
 * open5eapi.js
 * Open5e v2 search/detail normalization.
 */

const Open5eApiImporter = (() => {
  const API_BASE = "https://api.open5e.com/v2";

  const COLLECTION_ENDPOINTS = [
    { endpoint: "items", collection: "items" },
    { endpoint: "spells", collection: "spells" },
    { endpoint: "species", collection: "species" },
    { endpoint: "feats", collection: "feats" },
    { endpoint: "traits", collection: "traits" },
    { endpoint: "classes", collection: "classes" },
    { endpoint: "backgrounds", collection: "traits" },
    { endpoint: "conditions", collection: "traits" },
  ];

  async function search(query) {
    const clean = String(query || "").trim();
    if (!clean) return [];

    const global = fetchJson(`${API_BASE}/search/?query=${encodeURIComponent(clean)}&limit=50`)
      .then(data => (data.results || []).map(normalizeSearchResult))
      .catch(() => []);

    const collectionSearches = COLLECTION_ENDPOINTS.map(source => {
      const url = `${API_BASE}/${source.endpoint}/?name__icontains=${encodeURIComponent(clean)}&limit=20`;
      return fetchJson(url)
        .then(data => (data.results || []).map(raw => normalizeCollectionResult(source, raw)))
        .catch(() => []);
    });

    const results = (await Promise.all([global, ...collectionSearches])).flat();
    return dedupe(results).slice(0, 80);
  }

  async function detail(result = {}) {
    if (!result.detailUrl) return result.raw || result;
    return fetchJson(result.detailUrl);
  }

  function toRecord(result = {}, detailData = {}) {
    const detailRecord = detailData && Object.keys(detailData).length ? detailData : result.raw || result;
    const collection = result.collection || mapTypeToCollection(result.raw?.route || result.raw?.type || result.raw?.model || "");
    if (collection === "spells") return spellRecord(result, detailRecord);
    if (collection === "items") return itemRecord(result, detailRecord);
    if (collection === "species") return speciesRecord(result, detailRecord);
    if (collection === "feats") return featRecord(result, detailRecord);
    if (collection === "classes") return classRecord(result, detailRecord);
    return traitRecord(result, detailRecord);
  }

  function normalizeSearchResult(raw = {}) {
    const collection = mapTypeToCollection(raw.route || raw.resource_type || raw.type || raw.model || raw.object_model || "");
    const name = raw.object_name || raw.name || raw.title || "";
    const key = raw.object_pk || raw.key || raw.slug || LibraryRecords.slugify(name);
    const routePath = String(raw.route || "").replace(/^\/+|\/+$/g, "");
    return {
      provider: "open5eapi",
      providerLabel: "Open5e",
      collection,
      id: `open5eapi.${collection}.${LibraryRecords.slugify(key)}`,
      name: name || "(Unnamed)",
      typeLabel: raw.object_model || collection,
      sourceLabel: sourceLabel(raw),
      detailUrl: raw.api_url || raw.url || raw.resource_uri || (routePath && key ? `${API_BASE.replace(/\/v2$/, "")}/${routePath}/${key}/` : ""),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), collection]),
      raw,
    };
  }

  function normalizeCollectionResult(source, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || "");
    return {
      provider: "open5eapi",
      providerLabel: "Open5e",
      collection: source.collection,
      id: `open5eapi.${source.collection}.${LibraryRecords.slugify(key)}`,
      name: raw.name || raw.title || "(Unnamed)",
      typeLabel: source.endpoint,
      sourceLabel: sourceLabel(raw),
      detailUrl: `${API_BASE}/${source.endpoint}/${key}/`,
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), source.collection, raw.category?.key, raw.category?.name]),
      raw,
    };
  }

  function spellRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "spell");
    const level = Number(raw.level_int ?? raw.level ?? 0) || 0;
    const school = normalizeSchool(raw.school);
    return LibraryRecords.createRecord("spells", {
      id: `spells.${school || "unknown"}.${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["spells", school ? `spells/${school}` : "", `spells/level-${level}`].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "srd", "spell", school, ...(raw.classes || raw.spell_lists || [])]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        spell: {
          level,
          school,
          isRitual: Boolean(raw.ritual),
          requiresConcentration: Boolean(raw.concentration) || /concentration/i.test(raw.duration || ""),
        },
        spellcasting: {
          castingTime: quantityUnit(raw.casting_time || raw.castingTime || ""),
          range: quantityUnit(raw.range_text || raw.range || ""),
          duration: { text: raw.duration || "" },
          components: componentsObject(raw.components, raw),
        },
        spellLists: {
          classes: normalizeList(raw.classes || raw.spell_lists || raw.class_list || []),
          subclasses: normalizeList(raw.subclasses || []),
        },
        damage: {
          roll: raw.damage_roll || "",
          types: normalizeList(raw.damage_types || []),
          savingThrow: raw.saving_throw_ability || "",
        },
        area: {
          shape: raw.shape_type || "",
          size: raw.shape_size || null,
          unit: raw.shape_size_unit || "",
        },
        rulesText: {
          description: normalizeDescription(raw.desc || raw.description || ""),
          higherLevels: normalizeDescription(raw.higher_level || raw.higherLevel || ""),
        },
      },
      desc: normalizeDescription(raw.desc || raw.description || ""),
    });
  }

  function itemRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "item");
    const rawCategory = LibraryRecords.slugify(raw.category?.key || raw.category?.name || "item");
    const isAmmo = /ammunition|arrow|bolt|bullet|needle/i.test([rawCategory, raw.name, raw.desc].join(" "));
    const category = isAmmo ? "equipment" : rawCategory;
    const subcategory = isAmmo ? "ammunition" : "";
    return LibraryRecords.createRecord("items", {
      id: `items.${category}.${subcategory ? `${subcategory}.` : ""}${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["items", `items/${category}`, subcategory ? `items/${category}/${subcategory}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "item", rawCategory, subcategory, inferConsumableTag(raw)]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        item: {
          category,
          subcategory,
          rarity: LibraryRecords.optionalSlugify(raw.rarity?.key || raw.rarity?.name || ""),
        },
        inventory: {
          isStackable: /arrow|bolt|bullet|needle|ammunition/i.test(raw.name || raw.desc || ""),
          defaultQuantity: inferDefaultQuantity(raw),
          unitName: inferUnitName(raw),
          bundleName: inferDefaultQuantity(raw) > 1 ? "bundle" : "",
          consumedOnUse: Boolean(inferConsumableTag(raw)),
        },
        cost: raw.cost ? { quantity: Number(raw.cost), unit: raw.cost_unit || "gp", totalQuantity: inferDefaultQuantity(raw) } : undefined,
        weight: raw.weight ? { quantity: Number(raw.weight), unit: raw.weight_unit || "lb", totalQuantity: inferDefaultQuantity(raw) } : undefined,
        ammunition: isAmmo ? {
          ammunitionType: inferUnitName(raw),
          compatibleWeaponTags: inferUnitName(raw) === "arrow" ? ["bow"] : [],
          recoverable: true,
        } : undefined,
        rulesText: { description: normalizeDescription(raw.desc || raw.description || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || ""),
    });
  }

  function speciesRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "species");
    return LibraryRecords.createRecord("species", {
      id: `species.${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["species", raw.type ? `species/${LibraryRecords.slugify(raw.type)}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "species", raw.type, raw.name]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        species: {
          creatureType: LibraryRecords.slugify(raw.type || "humanoid"),
          sizeOptions: normalizeList(raw.size_options || raw.sizes || raw.size || []),
          defaultSize: LibraryRecords.slugify(raw.size || "medium"),
        },
        movement: { walk: { quantity: Number(raw.speed || raw.walk_speed || 30), unit: "ft" } },
        rulesText: { description: normalizeDescription(raw.desc || raw.description || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || ""),
    });
  }

  function featRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "feat");
    return LibraryRecords.createRecord("feats", {
      id: `feats.${LibraryRecords.slugify(raw.category?.key || raw.type || "general")}.${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["feats", raw.category?.key ? `feats/${LibraryRecords.slugify(raw.category.key)}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "feat", raw.category?.key, raw.type]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        feat: {
          featType: LibraryRecords.slugify(raw.category?.key || raw.type || "general"),
          hasPrerequisite: Boolean(raw.prerequisite || raw.prerequisites),
          prerequisite: raw.prerequisite || raw.prerequisites || null,
        },
        rulesText: { description: normalizeDescription(raw.desc || raw.description || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || ""),
    });
  }

  function classRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "class");
    return LibraryRecords.createRecord("classes", {
      id: `classes.${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["classes"],
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "class", raw.name]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        class: {
          hitDie: raw.hit_die ? `d${raw.hit_die}` : raw.hitDie || "",
          primaryAbility: raw.primary_ability || raw.primaryAbility || "",
        },
        rulesText: { description: normalizeDescription(raw.desc || raw.description || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || ""),
    });
  }

  function traitRecord(result, raw = {}) {
    const key = raw.key || raw.slug || LibraryRecords.slugify(raw.name || result.name || "trait");
    return LibraryRecords.createRecord("traits", {
      id: `traits.${LibraryRecords.slugify(raw.name || result.name || key)}`,
      name: raw.name || result.name || "",
      collections: ["traits", raw.category?.key ? `traits/${LibraryRecords.slugify(raw.category.key)}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["open5eapi", documentKey(raw), "trait", raw.category?.key, raw.type]),
      sourceReferences: [sourceRef(result, raw, key)],
      features: {
        trait: {
          traitType: LibraryRecords.slugify(raw.category?.key || raw.type || result.typeLabel || "trait"),
        },
        rulesText: { description: normalizeDescription(raw.desc || raw.description || raw.text || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || raw.text || ""),
    });
  }

  function sourceRef(result = {}, raw = {}, key = "") {
    return {
      provider: "open5eapi",
      sourceId: key || raw.key || raw.slug || result.id || "",
      url: result.detailUrl || raw.url || null,
      note: sourceLabel(raw),
    };
  }

  function mapTypeToCollection(type = "") {
    const value = String(type || "").toLowerCase();
    if (value.includes("spell")) return "spells";
    if (value.includes("item") || value.includes("equipment") || value.includes("weapon") || value.includes("armor")) return "items";
    if (value.includes("species") || value.includes("race") || value.includes("ancestr")) return "species";
    if (value.includes("feat")) return "feats";
    if (value.includes("class") || value.includes("subclass")) return "classes";
    return "traits";
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open5e API HTTP ${response.status}`);
    return response.json();
  }

  function sourceLabel(raw = {}) {
    const document = raw.document || {};
    return [document.display_name || document.name || document.title || raw.document__title || raw.document_title || documentKey(raw) || "Open5e", document.publisher?.name || raw.publisher || ""]
      .filter(Boolean)
      .join(" / ");
  }

  function documentKey(raw = {}) {
    return raw.document?.key || raw.document?.slug || raw.document__slug || raw.document_slug || "";
  }

  function normalizeSchool(value = "") {
    if (!value) return "";
    if (typeof value === "object") return LibraryRecords.slugify(value.name || value.key || "");
    return LibraryRecords.slugify(value);
  }

  function normalizeDescription(value = "") {
    if (Array.isArray(value)) return value.join("\n\n");
    return String(value || "").replace(/<[^>]+>/g, "");
  }

  function normalizeList(value = []) {
    if (Array.isArray(value)) return value.map(item => typeof item === "object" ? (item.name || item.key || item.index || "") : item).map(LibraryRecords.slugify).filter(Boolean);
    if (!value) return [];
    return [LibraryRecords.slugify(value)];
  }

  function quantityUnit(value = "") {
    const text = String(value || "").trim();
    const match = text.match(/^(\d+)\s*(.*)$/);
    return match ? { quantity: Number(match[1]), unit: match[2] || "" } : { text };
  }

  function componentsObject(value = [], raw = {}) {
    const parts = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
    return {
      verbal: parts.some(part => /^v$/i.test(part)) || Boolean(raw.verbal),
      somatic: parts.some(part => /^s$/i.test(part)) || Boolean(raw.somatic),
      material: parts.some(part => /^m$/i.test(part)) || Boolean(raw.material),
      materialDescription: raw.material || raw.material_specified || "",
    };
  }

  function inferDefaultQuantity(raw = {}) {
    const match = String(raw.name || "").match(/\((\d+)\)/);
    if (match) return Number(match[1]);
    return Number(raw.quantity || 1);
  }

  function inferUnitName(raw = {}) {
    const name = String(raw.name || "").toLowerCase();
    if (name.includes("arrow")) return "arrow";
    if (name.includes("bolt")) return "bolt";
    if (name.includes("bullet")) return "bullet";
    if (name.includes("needle")) return "needle";
    return LibraryRecords.slugify(raw.category?.name || raw.name || "item");
  }

  function inferConsumableTag(raw = {}) {
    return /potion|scroll|ammunition|arrow|bolt|bullet|needle/i.test([raw.name, raw.category?.name, raw.desc].join(" ")) ? "consumable" : "";
  }

  function dedupe(results = []) {
    const byKey = new Map();
    results.forEach(result => {
      const key = [result.provider, result.collection, LibraryRecords.slugify(result.name)].join("|");
      if (!byKey.has(key)) byKey.set(key, result);
    });
    return Array.from(byKey.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  return {
    search,
    detail,
    toRecord,
  };
})();
