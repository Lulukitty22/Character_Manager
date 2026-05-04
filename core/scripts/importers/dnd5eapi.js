/**
 * dnd5eapi.js
 * D&D 5e API search/detail normalization.
 */

const Dnd5eApiImporter = (() => {
  const API_BASE = "https://www.dnd5eapi.co/api/2014";

  const ENDPOINTS = [
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

  async function search(query) {
    const clean = String(query || "").trim().toLowerCase();
    if (!clean) return [];

    const endpointResults = await Promise.all(ENDPOINTS.map(async endpoint => {
      const data = await fetchJson(`${API_BASE}/${endpoint}`).catch(() => ({ results: [] }));
      return (data.results || [])
        .filter(entry => entry.name?.toLowerCase().includes(clean) || entry.index?.toLowerCase().includes(clean))
        .slice(0, 15)
        .map(entry => normalizeSearchResult(endpoint, entry));
    }));

    return dedupe(endpointResults.flat())
      .filter(result => !isGenericPotionTable(result))
      .slice(0, 80);
  }

  async function detail(result = {}) {
    if (!result.detailUrl) return result.raw || result;
    return fetchJson(result.detailUrl);
  }

  function toRecord(result = {}, detailData = {}) {
    const detailRecord = detailData && Object.keys(detailData).length ? detailData : result.raw || result;
    if (result.collection === "spells") return spellRecord(result, detailRecord);
    if (result.collection === "items") return itemRecord(result, detailRecord);
    if (result.collection === "species") return speciesRecord(result, detailRecord);
    if (result.collection === "feats") return featRecord(result, detailRecord);
    if (result.collection === "classes") return classRecord(result, detailRecord);
    return traitRecord(result, detailRecord);
  }

  function normalizeSearchResult(endpoint, raw = {}) {
    const collection = endpointToCollection(endpoint);
    return {
      provider: "dnd5eapi",
      providerLabel: "D&D 5e API",
      collection,
      id: `dnd5eapi.${collection}.${LibraryRecords.slugify(raw.index || raw.name)}`,
      name: raw.name || raw.index || "(Unnamed)",
      typeLabel: endpoint.replace(/-/g, " "),
      sourceLabel: "D&D 5e SRD 2014",
      detailUrl: raw.url ? `https://www.dnd5eapi.co${raw.url}` : "",
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", endpoint, raw.index]),
      raw: { ...raw, endpoint },
    };
  }

  function spellRecord(result, raw = {}) {
    const school = LibraryRecords.slugify(raw.school?.name || "");
    const level = Number(raw.level || 0) || 0;
    const components = Array.isArray(raw.components) ? raw.components : [];
    return LibraryRecords.createRecord("spells", {
      id: `spells.${school || "unknown"}.${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["spells", school ? `spells/${school}` : "", `spells/level-${level}`].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "spell", school, ...(raw.classes || []).map(item => item.name || item.index)]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        spell: {
          level,
          school,
          isRitual: Boolean(raw.ritual),
          requiresConcentration: Boolean(raw.concentration) || /concentration/i.test(raw.duration || ""),
        },
        spellcasting: {
          castingTime: quantityUnit(raw.casting_time || ""),
          range: quantityUnit(raw.range || ""),
          duration: { text: raw.duration || "" },
          components: {
            verbal: components.includes("V"),
            somatic: components.includes("S"),
            material: components.includes("M"),
            materialDescription: raw.material || "",
          },
        },
        spellLists: {
          classes: normalizeRefs(raw.classes || []),
          subclasses: normalizeRefs(raw.subclasses || []),
        },
        resolution: {
          attackRoll: Boolean(raw.attack_type),
          savingThrow: raw.dc?.dc_type?.index || null,
        },
        damage: {
          damageType: raw.damage?.damage_type?.index || "",
          damageAtSlotLevel: raw.damage?.damage_at_slot_level || {},
          damageAtCharacterLevel: raw.damage?.damage_at_character_level || {},
        },
        area: raw.area_of_effect || {},
        rulesText: {
          description: normalizeDescription(raw.desc || ""),
          higherLevels: normalizeDescription(raw.higher_level || ""),
        },
      },
      desc: normalizeDescription(raw.desc || ""),
    });
  }

  function itemRecord(result, raw = {}) {
    const endpoint = result.raw?.endpoint || "";
    const rawCategory = LibraryRecords.slugify(raw.gear_category?.index || raw.equipment_category?.index || raw.rarity?.name || endpoint || "item");
    const isAmmo = /ammunition|arrow|bolt|bullet|needle/i.test([rawCategory, raw.name, raw.index].join(" "));
    const category = isAmmo ? "equipment" : rawCategory;
    const subcategory = isAmmo ? "ammunition" : "";
    const healDice = healingDice(raw);
    const actions = [];
    if (healDice) {
      actions.push({
        label: "Drink",
        consumeQuantity: true,
        effects: { heal: { dice: healDice } },
        description: "Consume this item and regain hit points.",
      });
    }
    if (isAmmo) {
      actions.push({
        label: "Use 1",
        consumeQuantity: true,
        effects: {},
        description: "Spend one piece of ammunition.",
      });
    }

    return LibraryRecords.createRecord("items", {
      id: `items.${category}.${subcategory ? `${subcategory}.` : ""}${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["items", `items/${category}`, subcategory ? `items/${category}/${subcategory}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "item", rawCategory, subcategory, healDice ? "healing" : "", actions.length ? "consumable" : ""]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        item: {
          category,
          subcategory,
          rarity: LibraryRecords.optionalSlugify(raw.rarity?.name || ""),
          requiresAttunement: Boolean(raw.requires_attunement),
        },
        inventory: {
          isStackable: isAmmo,
          defaultQuantity: Number(raw.quantity || (isAmmo ? 20 : 1)),
          unitName: isAmmo ? inferAmmoUnit(raw) : LibraryRecords.slugify(raw.name || "item"),
          bundleName: isAmmo ? "bundle" : "",
          consumedOnUse: actions.length > 0,
        },
        cost: raw.cost ? { quantity: Number(raw.cost.quantity || 0), unit: raw.cost.unit || "gp", totalQuantity: Number(raw.quantity || 1) } : undefined,
        weight: raw.weight != null ? { quantity: Number(raw.weight), unit: "lb", totalQuantity: Number(raw.quantity || 1) } : undefined,
        ammunition: isAmmo ? {
          ammunitionType: inferAmmoUnit(raw),
          compatibleWeaponTags: inferAmmoUnit(raw) === "arrow" ? ["bow"] : [],
          recoverable: true,
        } : undefined,
        healing: healDice ? { dice: healDice } : undefined,
        actions,
        rulesText: { description: normalizeDescription(raw.desc || raw.description || raw.special || "") },
      },
      desc: normalizeDescription(raw.desc || raw.description || raw.special || ""),
    });
  }

  function speciesRecord(result, raw = {}) {
    return LibraryRecords.createRecord("species", {
      id: `species.${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["species", "species/humanoid"],
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "species", raw.name]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        species: {
          creatureType: "humanoid",
          sizeOptions: [LibraryRecords.slugify(raw.size || "medium")],
          defaultSize: LibraryRecords.slugify(raw.size || "medium"),
        },
        movement: { walk: { quantity: Number(raw.speed || 30), unit: "ft" } },
        languages: { known: normalizeRefs(raw.languages || []) },
        abilityBonuses: normalizeAbilityBonuses(raw.ability_bonuses || []),
        traits: { traitIds: normalizeRefs(raw.traits || []).map(id => `traits.${id}`) },
        rulesText: {
          description: normalizeDescription(raw.alignment || raw.age || ""),
          age: raw.age || "",
          alignment: raw.alignment || "",
          size: raw.size_description || "",
        },
      },
      desc: normalizeDescription([raw.age, raw.alignment, raw.size_description].filter(Boolean).join("\n\n")),
    });
  }

  function featRecord(result, raw = {}) {
    return LibraryRecords.createRecord("feats", {
      id: `feats.general.${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["feats"],
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "feat"]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        feat: {
          featType: "general",
          hasPrerequisite: Array.isArray(raw.prerequisites) && raw.prerequisites.length > 0,
          prerequisite: raw.prerequisites || null,
        },
        rulesText: { description: normalizeDescription(raw.desc || "") },
      },
      desc: normalizeDescription(raw.desc || ""),
    });
  }

  function classRecord(result, raw = {}) {
    return LibraryRecords.createRecord("classes", {
      id: `classes.${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["classes"],
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "class", raw.name]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        class: {
          hitDie: raw.hit_die ? `d${raw.hit_die}` : "",
          primaryAbility: "",
        },
        proficiencies: normalizeRefs(raw.proficiencies || []),
        savingThrows: normalizeRefs(raw.saving_throws || []),
        spellcastingProgression: inferSpellcastingProgression(raw),
        rulesText: { description: normalizeDescription(raw.desc || "") },
      },
      desc: normalizeDescription(raw.desc || ""),
    });
  }

  function traitRecord(result, raw = {}) {
    const endpoint = result.raw?.endpoint || "";
    return LibraryRecords.createRecord("traits", {
      id: `traits.${LibraryRecords.slugify(raw.name || result.name || raw.index)}`,
      name: raw.name || result.name || "",
      collections: ["traits", endpoint ? `traits/${LibraryRecords.slugify(endpoint)}` : ""].filter(Boolean),
      tags: LibraryRecords.normalizeTags(["dnd5eapi", "srd", "trait", endpoint]),
      sourceReferences: [sourceRef(result, raw)],
      features: {
        trait: {
          traitType: LibraryRecords.slugify(endpoint || "trait"),
          grantedBy: normalizeRefs(raw.parent || raw.races || raw.classes || []),
        },
        rulesText: { description: normalizeDescription(raw.desc || "") },
      },
      desc: normalizeDescription(raw.desc || ""),
    });
  }

  function endpointToCollection(endpoint = "") {
    if (endpoint === "spells") return "spells";
    if (["equipment", "magic-items"].includes(endpoint)) return "items";
    if (endpoint === "feats") return "feats";
    if (["classes", "subclasses"].includes(endpoint)) return "classes";
    if (endpoint === "races") return "species";
    return "traits";
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`D&D 5e API HTTP ${response.status}`);
    return response.json();
  }

  function sourceRef(result = {}, raw = {}) {
    return {
      provider: "dnd5eapi",
      sourceId: raw.index || result.raw?.index || result.id || "",
      url: result.detailUrl || (raw.url ? `https://www.dnd5eapi.co${raw.url}` : null),
      note: "D&D 5e SRD 2014",
    };
  }

  function normalizeDescription(value = "") {
    if (Array.isArray(value)) return value.join("\n\n");
    return String(value || "").replace(/<[^>]+>/g, "");
  }

  function normalizeRefs(value = []) {
    if (!Array.isArray(value)) value = [value];
    return value.map(item => LibraryRecords.slugify(typeof item === "object" ? (item.index || item.name || "") : item)).filter(Boolean);
  }

  function normalizeAbilityBonuses(bonuses = []) {
    return bonuses.reduce((map, bonus) => {
      const ability = LibraryRecords.slugify(bonus.ability_score?.index || bonus.ability_score?.name || "");
      if (ability) map[ability] = Number(bonus.bonus || 0);
      return map;
    }, {});
  }

  function quantityUnit(value = "") {
    const text = String(value || "").trim();
    const match = text.match(/^(\d+)\s*(.*)$/);
    return match ? { quantity: Number(match[1]), unit: match[2] || "" } : { text };
  }

  function healingDice(raw = {}) {
    const text = normalizeDescription([raw.name, raw.desc].flat().join(" "));
    const match = text.match(/regain[s]?\s+(\d+d\d+(?:\s*\+\s*\d+)?)\s+hit points/i);
    return match?.[1] || "";
  }

  function inferAmmoUnit(raw = {}) {
    const name = String(raw.name || raw.index || "").toLowerCase();
    if (name.includes("arrow")) return "arrow";
    if (name.includes("bolt")) return "bolt";
    if (name.includes("bullet")) return "bullet";
    if (name.includes("needle")) return "needle";
    return "ammunition";
  }

  function inferSpellcastingProgression(raw = {}) {
    const key = LibraryRecords.slugify(raw.index || raw.name || "");
    if (["bard", "cleric", "druid", "sorcerer", "wizard"].includes(key)) return { progression: "full" };
    if (["paladin", "ranger"].includes(key)) return { progression: "half" };
    if (key === "warlock") return { progression: "pact" };
    return { progression: "none" };
  }

  function isGenericPotionTable(result = {}) {
    return result.raw?.endpoint === "magic-items" && result.raw?.index === "potion-of-healing";
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
