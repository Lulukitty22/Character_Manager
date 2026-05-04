/**
 * library-records.js
 * Canonical shared-library record helpers.
 */

const LibraryRecords = (() => {
  const SCHEMA_VERSION = 1;

  const COLLECTION_ALIASES = {
    race: "species",
    races: "species",
    species: "species",
  };

  const PROVIDER_LABELS = {
    open5eapi: "Open5e",
    dnd5eapi: "D&D 5e API",
    internal: "Internal",
  };

  function canonicalCollection(collection = "") {
    const clean = slugify(collection);
    return COLLECTION_ALIASES[clean] || clean;
  }

  function createRecord(collection, patch = {}) {
    const canonical = canonicalCollection(collection || patch.collection || patch.collections?.[0] || "traits");
    const record = {
      schemaVersion: SCHEMA_VERSION,
      id: patch.id || `${canonical}.${slugify(patch.name || "record")}`,
      name: patch.name || "",
      collections: normalizeCollections(patch.collections, canonical),
      tags: normalizeTags(patch.tags),
      variantOf: patch.variantOf || null,
      sourceReferences: normalizeSourceReferences(patch.sourceReferences),
      features: patch.features && typeof patch.features === "object" ? patch.features : {},
      desc: patch.desc ?? patch.description ?? "",
    };

    return normalizeRecord(record, canonical);
  }

  function normalizeRecord(raw = {}, fallbackCollection = "") {
    const canonical = canonicalCollection(
      raw.collections?.[0]
      || raw.collection
      || fallbackCollection
      || inferCollectionFromId(raw.id)
      || "traits"
    );

    if (Number(raw.schemaVersion || 0) >= 1) {
      const features = raw.features && typeof raw.features === "object" ? raw.features : {};
      if (features.item?.rarity === "record") features.item.rarity = "";
      if (features.item?.subcategory === "record") features.item.subcategory = "";
      return {
        schemaVersion: SCHEMA_VERSION,
        id: canonical === "tags" ? tagId(raw.id || raw.name || "record") : (raw.id || `${canonical}.${slugify(raw.name || "record")}`),
        name: raw.name || "",
        collections: normalizeCollections(raw.collections, canonical),
        tags: normalizeTags(raw.tags),
        variantOf: raw.variantOf || null,
        sourceReferences: normalizeSourceReferences(raw.sourceReferences),
        features,
        desc: raw.desc ?? raw.description ?? "",
      };
    }

    return fromLegacyRecord(raw, canonical);
  }

  function fromLegacyRecord(raw = {}, collection = "") {
    const canonical = canonicalCollection(collection || raw.collection || "traits");
    const id = canonicalIdFor(canonical, raw.id || raw.name || "record");
    const sourceReferences = [];

    if (raw.provider || raw.providerId || raw.addons?.sourceDocument?.detailUrl) {
      sourceReferences.push({
        provider: normalizeProviderId(raw.provider || raw.source || "internal"),
        sourceId: raw.providerId || raw.id || "",
        url: raw.addons?.sourceDocument?.detailUrl || raw.open5eUrl || null,
        note: raw.addons?.sourceDocument?.title || "",
      });
    }

    const features = legacyFeatures(raw, canonical);
    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      name: raw.name || "",
      collections: collectionsForLegacy(raw, canonical),
      tags: normalizeTags([
        ...(raw.tags || []),
        raw.provider ? normalizeProviderId(raw.provider) : "",
        raw.source === "srd" ? "srd" : "",
        canonical === "species" ? "species" : "",
      ]),
      variantOf: raw.variantOf || null,
      sourceReferences: normalizeSourceReferences(sourceReferences),
      features,
      desc: raw.desc ?? raw.description ?? "",
    };
  }

  function legacyFeatures(raw = {}, collection = "") {
    const features = {
      ...(raw.features && typeof raw.features === "object" ? raw.features : {}),
    };
    const addons = raw.addons || {};

    if (collection === "spells") {
      features.spell = {
        level: Number(raw.level || 0) || 0,
        school: slugify(raw.school || ""),
        isRitual: Boolean(addons.ritual?.enabled),
        requiresConcentration: Boolean(addons.concentration?.enabled),
      };
      features.spellcasting = {
        castingTime: parseQuantityUnit(raw.castingTime || ""),
        range: parseQuantityUnit(raw.range || ""),
        duration: { text: raw.duration || "" },
        components: componentsObject(raw.components || addons.components || []),
      };
      if (addons.damage) features.damage = addons.damage;
      if (addons.area) features.area = addons.area;
      features.rulesText = { description: raw.description || "" };
    }

    if (collection === "items") {
      features.item = {
        category: slugify(raw.type || addons.equipment?.slot || "misc"),
        subcategory: optionalSlugify(addons.equipment?.category || ""),
        rarity: optionalSlugify(addons.equipment?.rarity || ""),
        requiresAttunement: Boolean(raw.attuned || addons.requiresAttunement),
      };
      if (raw.weight != null) features.weight = { quantity: Number(raw.weight), unit: "lb" };
      if (addons.healing) features.healing = addons.healing;
      if (addons.effects) features.effects = addons.effects;
      if (Array.isArray(addons.actions)) features.actions = addons.actions;
      features.inventory = {
        isStackable: Boolean((raw.tags || []).some(tag => /ammo|ammunition|stack/i.test(tag))),
        defaultQuantity: Number(raw.quantity || 1),
        consumedOnUse: raw.type === "consumable",
      };
    }

    if (collection === "resources") {
      features.resource = {
        defaultMax: Number(raw.max || 0),
        currentIsCharacterState: true,
        logIsCharacterState: true,
      };
    }

    if (collection === "classes") {
      features.class = {
        hitDie: raw.hitDie || addons.hp?.hitDie || "",
        primaryAbility: raw.primaryAbility || "",
      };
      if (addons.spellcasting) features.spellcastingProgression = addons.spellcasting;
    }

    if (collection === "species") {
      features.species = {
        creatureType: "humanoid",
        defaultSize: "medium",
      };
      features.movement = { walk: { quantity: Number(raw.speed?.walk || 30), unit: "ft" } };
      if (addons.stats) features.abilityBonuses = addons.stats;
      if (addons.hp) features.hp = addons.hp;
      if (addons.traits) features.traits = { traitIds: addons.traits };
    }

    if (["feats", "traits", "tags"].includes(collection)) {
      features[collection.slice(0, -1) || collection] = {};
      features.rulesText = { description: raw.description || "" };
    }

    if (Array.isArray(addons.mechanics) && addons.mechanics.length) {
      features.mechanics = addons.mechanics;
    }

    return features;
  }

  function toRuntimeRecord(record = {}, collection = "") {
    const canonical = normalizeRecord(record, collection);
    const runtime = {
      ...canonical,
      collection: canonicalCollection(collection || canonical.collections[0] || ""),
      source: primarySource(canonical),
      provider: primaryProvider(canonical),
      providerId: primarySourceReference(canonical)?.sourceId || "",
      description: canonical.desc || canonical.features?.rulesText?.description || "",
      addons: runtimeAddons(canonical),
    };

    if (runtime.collection === "spells") {
      runtime.level = Number(canonical.features?.spell?.level || 0) || 0;
      runtime.school = canonical.features?.spell?.school || "";
      runtime.castingTime = formatQuantityUnit(canonical.features?.spellcasting?.castingTime);
      runtime.range = formatQuantityUnit(canonical.features?.spellcasting?.range);
      runtime.components = componentsArray(canonical.features?.spellcasting?.components);
      runtime.duration = canonical.features?.spellcasting?.duration?.text || canonical.features?.spellcasting?.duration?.type || "";
    }

    if (runtime.collection === "items") {
      runtime.type = canonical.features?.item?.category || "misc";
      runtime.weight = canonical.features?.weight?.quantity ?? null;
      runtime.attuned = Boolean(canonical.features?.item?.requiresAttunement);
      runtime.active = true;
    }

    if (runtime.collection === "resources") {
      runtime.max = Number(canonical.features?.resource?.defaultMax || 0);
    }

    if (runtime.collection === "classes") {
      runtime.hitDie = canonical.features?.class?.hitDie || "";
      runtime.primaryAbility = canonical.features?.class?.primaryAbility || "";
    }

    if (runtime.collection === "species") {
      runtime.speed = { walk: Number(canonical.features?.movement?.walk?.quantity || 30) };
    }

    return runtime;
  }

  function runtimeAddons(record = {}) {
    const features = record.features || {};
    const source = primarySourceReference(record);
    return {
      mechanics: [
        ...(features.mechanics || []),
        ...mechanicChipsFromFeatures(features),
      ],
      sourceDocument: source ? {
        provider: source.provider,
        title: PROVIDER_LABELS[source.provider] || source.provider,
        detailUrl: source.url || "",
      } : null,
      equipment: features.item ? {
        slot: features.item.category || "",
        rarity: features.item.rarity || "",
        category: features.item.subcategory || "",
      } : undefined,
      healing: features.healing,
      effects: features.effects,
      actions: features.actions || [],
      hp: features.hp,
      spellcasting: features.spellcastingProgression,
    };
  }

  function mechanicChipsFromFeatures(features = {}) {
    const chips = [];
    if (features.item?.category) chips.push({ label: "Type", value: features.item.category, kind: "neutral" });
    if (features.item?.rarity) chips.push({ label: "Rarity", value: features.item.rarity, kind: "positive" });
    if (features.weight?.quantity != null) chips.push({ label: "Weight", value: `${features.weight.quantity} ${features.weight.unit || ""}`.trim(), kind: "neutral" });
    if (features.spell?.level != null) chips.push({ label: "Level", value: features.spell.level ? String(features.spell.level) : "Cantrip", kind: "neutral" });
    if (features.spell?.school) chips.push({ label: "School", value: features.spell.school, kind: "neutral" });
    if (features.resource?.defaultMax != null) chips.push({ label: "Max", value: features.resource.defaultMax, kind: "quantity" });
    return chips;
  }

  function primarySource(record = {}) {
    const provider = primaryProvider(record);
    if (provider === "internal") return "custom";
    if (provider) return "external";
    return "custom";
  }

  function primaryProvider(record = {}) {
    return primarySourceReference(record)?.provider || "";
  }

  function primarySourceReference(record = {}) {
    return (record.sourceReferences || [])[0] || null;
  }

  function recordPath(record = {}, fallbackCollection = "") {
    const canonical = normalizeRecord(record, fallbackCollection);
    const id = canonical.id || `${canonical.collections[0]}.${slugify(canonical.name || "record")}`;
    if (id.startsWith("tag:")) return `library/tags/${slugify(id.slice(4))}.json`;
    const root = canonicalCollection((canonical.collections[0] || fallbackCollection || "traits").split("/")[0]);
    const deepest = (canonical.collections || [root])
      .filter(collection => collection.split("/")[0] === root)
      .sort((a, b) => b.split("/").length - a.split("/").length)[0] || root;
    const parts = id.split(".").map(slugify).filter(Boolean);
    const fileName = parts[0] === root ? (parts.at(-1) || slugify(canonical.name || "record")) : (parts.at(-1) || slugify(id));
    return `library/${deepest}/${fileName}.json`;
  }

  function indexPath(collection = "", path = "") {
    const clean = path.replace(/^library\/|\/[^/]+\.json$/g, "");
    return clean ? `library/${clean}/index.json` : `library/${canonicalCollection(collection)}/index.json`;
  }

  function manifestEntry(record = {}, path = "", sha = "") {
    const canonical = normalizeRecord(record);
    return {
      id: canonical.id,
      name: canonical.name || "",
      collections: canonical.collections || [],
      tags: canonical.tags || [],
      path,
      sha: sha || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeCollections(collections, fallback = "") {
    const first = canonicalCollection(Array.isArray(collections) ? collections[0] : fallback);
    const values = Array.isArray(collections) && collections.length ? collections : [first];
    return unique(values.map(value => {
      const parts = String(value || "").split("/").filter(Boolean);
      if (!parts.length) return first;
      parts[0] = canonicalCollection(parts[0]);
      return parts.join("/");
    }));
  }

  function collectionsForLegacy(raw = {}, collection = "") {
    const canonical = canonicalCollection(collection);
    if (canonical === "spells") {
      const school = slugify(raw.school || raw.features?.spell?.school || "");
      const level = Number(raw.level || raw.features?.spell?.level || 0);
      return ["spells", school ? `spells/${school}` : "", `spells/level-${level}`].filter(Boolean);
    }
    if (canonical === "items") {
      const type = slugify(raw.type || raw.addons?.equipment?.slot || "misc");
      const category = slugify(raw.addons?.equipment?.category || "");
      return ["items", type ? `items/${type}` : "", category ? `items/${type}/${category}` : ""].filter(Boolean);
    }
    return [canonical];
  }

  function normalizeTags(tags = []) {
    return unique((Array.isArray(tags) ? tags : [tags])
      .map(tag => String(tag || "").trim())
      .filter(Boolean)
      .map(normalizeTag));
  }

  function normalizeTag(tag = "") {
    const clean = String(tag || "").trim();
    if (clean.startsWith("tag:")) return `tag:${slugify(clean.slice(4))}`;
    const slug = slugify(clean);
    if (/^open5e(api)?$|open5e-api/.test(slug)) return "open5eapi";
    if (/^dnd5eapi$|dnd-5e-api|dandd-5e-api|d-d-5e-api/.test(slug)) return "dnd5eapi";
    if (/^srd(-20(14|24))?$|system-reference-document/.test(slug)) return "srd";
    return slug;
  }

  function normalizeSourceReferences(sources = []) {
    return (Array.isArray(sources) ? sources : [sources]).filter(Boolean).map(source => ({
      provider: normalizeProviderId(source.provider || "internal"),
      sourceId: source.sourceId || source.id || "",
      url: source.url || null,
      ...(source.note ? { note: source.note } : {}),
    }));
  }

  function normalizeProviderId(provider = "") {
    const clean = slugify(provider);
    if (clean.includes("open5e")) return "open5eapi";
    if (clean.includes("dnd5e") || clean.includes("d-d-5e")) return "dnd5eapi";
    if (!clean || clean === "custom") return "internal";
    return clean;
  }

  function canonicalIdFor(collection, value) {
    const clean = String(value || "").trim();
    if (clean.includes(".") || clean.startsWith("tag:")) return clean;
    if (canonicalCollection(collection) === "tags") return tagId(clean);
    return `${canonicalCollection(collection)}.${slugify(clean)}`;
  }

  function tagId(value = "") {
    const clean = String(value || "").replace(/^tags\./, "").replace(/^tag:/, "");
    return `tag:${slugify(clean)}`;
  }

  function inferCollectionFromId(id = "") {
    if (String(id).startsWith("tag:")) return "tags";
    return canonicalCollection(String(id).split(".")[0] || "");
  }

  function parseQuantityUnit(value = "") {
    if (value && typeof value === "object") return value;
    const text = String(value || "").trim();
    const match = text.match(/^(\d+)\s*(.*)$/);
    if (!match) return { text };
    return { quantity: Number(match[1]), unit: match[2] || "" };
  }

  function formatQuantityUnit(value = {}) {
    if (!value) return "";
    if (value.text) return value.text;
    return [value.quantity, value.unit].filter(part => part != null && part !== "").join(" ");
  }

  function componentsObject(value = []) {
    const components = componentsArray(value).map(component => component.toUpperCase());
    return {
      verbal: components.includes("V"),
      somatic: components.includes("S"),
      material: components.includes("M"),
      materialDescription: "",
    };
  }

  function componentsArray(value = {}) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
    if (!value || typeof value !== "object") return [];
    return [
      value.verbal ? "V" : "",
      value.somatic ? "S" : "",
      value.material ? "M" : "",
    ].filter(Boolean);
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9:.]+/g, "-")
      .replace(/^-|-$/g, "") || "record";
  }

  function optionalSlugify(text) {
    const clean = String(text || "").trim();
    return clean ? slugify(clean) : "";
  }

  function unique(values = []) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  return {
    SCHEMA_VERSION,
    PROVIDER_LABELS,
    canonicalCollection,
    createRecord,
    normalizeRecord,
    toRuntimeRecord,
    recordPath,
    indexPath,
    manifestEntry,
    normalizeTags,
    normalizeProviderId,
    slugify,
    optionalSlugify,
    unique,
  };
})();
