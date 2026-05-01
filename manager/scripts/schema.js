/**
 * schema.js
 * Defines default structures for character sections, provides UUID generation,
 * and helpers to create/validate character data objects.
 *
 * All sections (dnd, boss, roblox, spells, etc.) are optional on a character.
 * Unused sections are simply omitted from the JSON.
 */

const Schema = (() => {

  // ─── UUID Generation ───────────────────────────────────────────────────────

  function generateId() {
    // Use crypto.randomUUID when available, otherwise fall back to a manual method
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const randomValue = (Math.random() * 16) | 0;
      const value       = character === "x" ? randomValue : (randomValue & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  // ─── Character Types ───────────────────────────────────────────────────────

  const CHARACTER_CLASSIFICATIONS = {
    player_character:   { icon: "⚔️", label: "Player Character" },
    boss_npc:           { icon: "💀", label: "Boss / NPC" },
    original_character: { icon: "✨", label: "Original Character" },
    roblox_oc:          { icon: "🎮", label: "Roblox OC" },
  };

  function createBaseCharacter() {
    return {
      id:   generateId(),
      meta: {
        repoPath:    "",
        lastUpdated: new Date().toISOString(),
      },
      identity:   createDefaultIdentity(),
      appearance: createDefaultAppearance(),
      personality:  "",
      backstory:    "",
      notes:        "",
      spells:       [],
      spellSlots:   {},
      abilities:    [],
      inventory:    [],
      currency:     { gp: 0, sp: 0, cp: 0, ep: 0, pp: 0 },
      customResources: [],
    };
  }

  // ─── Default Structures ────────────────────────────────────────────────────

  function createDefaultIdentity() {
    return {
      name:    "",
      classification: "",
      aliases: [],
      race:    "",
      height:  "",
      age:     "",
      origin:  "",
      tags:    [],
    };
  }

  function createDefaultAppearance() {
    return {
      description: "",
      images:      [],
    };
  }

  function createDefaultSpell() {
    return {
      id:          generateId(),
      source:      "inline",
      name:        "",
      level:       0,
      school:      "",
      castingTime: "1 action",
      range:       "",
      components:  [],
      duration:    "",
      description: "",
      prepared:    false,
      access:      null,
      tags:        [],
    };
  }

  function createDefaultAbility() {
    return {
      id:          generateId(),
      source:      "inline",
      name:        "",
      type:        "passive",
      description: "",
      active:      false,
      tags:        [],
    };
  }

  function createDefaultInventoryItem() {
    return {
      id:          generateId(),
      source:      "inline",
      name:        "",
      type:        "misc",
      quantity:    1,
      weight:      null,
      attuned:     false,
      description: "",
      tags:        [],
    };
  }

  function createDefaultCustomResource() {
    return {
      id:      generateId(),
      source:  "inline",
      name:    "",
      max:     0,
      current: 0,
      log:  [],
    };
  }

  function createDefaultFeat() {
    return {
      id:          generateId(),
      source:      "inline",
      name:        "",
      description: "",
      tags:        [],
    };
  }

  function createLibraryRecord(collection) {
    const id = generateId();

    const base = {
      id,
      collection,
      name: "",
      tags: [],
      source: "custom",
      provider: "",
      providerId: "",
      variantOf: "",
      addons: { mechanics: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (collection === "spells") {
      return {
        ...base,
        level: 0,
        school: "",
        castingTime: "1 action",
        range: "",
        components: [],
        duration: "",
        description: "",
        addons: {
          mechanics: [],
          components: [],
          ritual: { enabled: false },
          concentration: { enabled: false },
        },
      };
    }

    if (collection === "items") {
      return {
        ...base,
        type: "misc",
        weight: null,
        attuned: false,
        description: "",
        addons: {
          mechanics: [],
          equipment: { slot: "", rarity: "" },
        },
      };
    }

    if (collection === "resources") {
      return {
        ...base,
        max: 0,
        description: "",
        addons: {
          mechanics: [],
          resource: { currentIsCharacterState: true, logIsCharacterState: true },
        },
      };
    }

    if (collection === "tags") {
      return {
        ...base,
        color: "",
        description: "",
        addons: { mechanics: [] },
      };
    }

    if (collection === "feats") {
      return {
        ...base,
        description: "",
        addons: {
          mechanics: [],
          prerequisites: [],
        },
      };
    }

    if (collection === "traits") {
      return {
        ...base,
        type: "trait",
        description: "",
        addons: { mechanics: [] },
      };
    }

    if (collection === "classes") {
      return {
        ...base,
        description: "",
        hitDie: "",
        primaryAbility: "",
        addons: {
          mechanics: [],
          stats: {},
          speed: {},
          proficiencies: [],
          feats: [],
        },
      };
    }

    return base;
  }

  function createLibraryCollection(collection) {
    return {
      version: 1,
      collection,
      entries: [],
    };
  }

  function createCharacterLibraryRef(collection, entry, state = {}) {
    return {
      id: generateId(),
      source: "library",
      libraryCollection: collection,
      librarySource: entry.source || "custom",
      libraryRef: entry.id,
      overrides: {},
      ...state,
    };
  }

  function normalizeOpen5eSpell(open5eData = {}) {
    const descriptionParts = []
      .concat(open5eData.desc || [])
      .concat(open5eData.higher_level || open5eData.higherLevel || []);
    const document = open5eData.document || {};
    const key = open5eData.key || open5eData.object_pk || open5eData.slug || open5eData.id || slugify(open5eData.name || open5eData.object_name || "spell");
    const record = createLibraryRecord("spells");
    const components = normalizeComponents(open5eData.components, open5eData);
    const documentTitle = document.display_name || document.title || document.name || open5eData.document__title || "";
    const documentKey = document.key || document.slug || open5eData.document__slug || "";
    const publisher = document.publisher?.name || open5eData.publisher || open5eData.source || "";

    return {
      ...record,
      id: `open5e-spells-${key}`,
      source: "srd",
      provider: "open5e",
      providerId: key,
      name: open5eData.name || open5eData.object_name || "",
      level: Number(open5eData.level_int ?? open5eData.level ?? 0) || 0,
      school: normalizeSchool(open5eData.school || open5eData.object?.school),
      castingTime: open5eData.casting_time || open5eData.castingTime || "",
      range: open5eData.range_text || open5eData.range || "",
      components,
      duration: open5eData.duration || "",
      description: descriptionParts.filter(Boolean).join("\n\n"),
      tags: [
        "Open5e",
        documentTitle,
        documentKey || "SRD",
        publisher,
        document.gamesystem?.name || "",
      ].filter(Boolean),
      addons: {
        components,
        ritual: { enabled: Boolean(open5eData.ritual) },
        concentration: { enabled: Boolean(open5eData.concentration) || /concentration/i.test(open5eData.duration || "") },
        damage: {
          roll: open5eData.damage_roll || "",
          types: open5eData.damage_types || [],
          savingThrow: open5eData.saving_throw_ability || "",
        },
        area: {
          shape: open5eData.shape_type || "",
          size: open5eData.shape_size || null,
          unit: open5eData.shape_size_unit || "",
        },
        mechanics: buildSpellMechanics({
          castingTime: open5eData.casting_time || open5eData.castingTime || "",
          range: open5eData.range_text || open5eData.range || "",
          components,
          duration: open5eData.duration || "",
          ritual: Boolean(open5eData.ritual),
          concentration: Boolean(open5eData.concentration) || /concentration/i.test(open5eData.duration || ""),
          damageRoll: open5eData.damage_roll || "",
          damageTypes: open5eData.damage_types || [],
          savingThrow: open5eData.saving_throw_ability || "",
          areaShape: open5eData.shape_type || "",
          areaSize: open5eData.shape_size || null,
          areaUnit: open5eData.shape_size_unit || "",
        }),
        sourceDocument: {
          provider: "open5e",
          key: documentKey,
          title: documentTitle,
          publisher,
          gameSystem: document.gamesystem?.name || "",
        },
      },
      open5eUrl: open5eData.url || "",
      updatedAt: new Date().toISOString(),
    };
  }

  function normalizeSchool(value) {
    if (!value) return "";
    if (typeof value === "string") {
      const found = SCHOOLS_OF_MAGIC.find(school => school.toLowerCase() === value.toLowerCase());
      return found || value.charAt(0).toUpperCase() + value.slice(1);
    }
    if (typeof value === "object") {
      return value.name || value.key || "";
    }
    return String(value);
  }

  function normalizeComponents(value, spellData = {}) {
    if (Array.isArray(value)) return value.map(component => String(component).trim()).filter(Boolean);
    if (typeof value === "string") {
      return value.split(/[,\s]+/).map(component => component.trim()).filter(Boolean);
    }
    const components = [];
    if (spellData.verbal) components.push("V");
    if (spellData.somatic) components.push("S");
    if (spellData.material) components.push("M");
    if (components.length) return components;
    return [];
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

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || generateId();
  }

  function createDefaultResourceLogEntry(delta, reason) {
    return {
      id:     generateId(),
      date:   new Date().toISOString().slice(0, 10),
      delta:  delta,
      reason: reason || "",
    };
  }

  function createDefaultHpLogEntry(delta, reason) {
    return createDefaultResourceLogEntry(delta, reason);
  }

  // ─── D&D-Specific Defaults ─────────────────────────────────────────────────

  function createDefaultDndStats() {
    return {
      str: { score: 10 },
      dex: { score: 10 },
      con: { score: 10 },
      int: { score: 10 },
      wis: { score: 10 },
      cha: { score: 10 },
    };
  }

  function createDefaultDnd() {
    return {
      class:                   "",
      subclass:                "",
      level:                   1,
      multiclass:              [],
      background:              "",
      alignment:               "",
      proficiencyBonus:        2,
      spellcastingAbility:     "wis",
      stats:                   createDefaultDndStats(),
      savingThrowProficiencies: [],
      skillProficiencies:      [],
      hp: {
        max:     0,
        current: 0,
        temp:    0,
        log:     [],
      },
      acModes: [
        { id: generateId(), label: "Base", value: 10, active: true },
      ],
      speed:      { walk: 30, fly: 0, swim: 0, climb: 0, burrow: 0 },
      initiative: 0,
      feats:      [],
    };
  }

  function createDefaultAttack() {
    return {
      id:          generateId(),
      name:        "",
      toHitBonus:  0,
      advantage:   false,
      reach:       "5 ft",
      damage:      [createDefaultDamageRoll()],
      avgDamage:   0,
      onHit:       "",
      description: "",
    };
  }

  function createDefaultDamageRoll() {
    return {
      dice:   "1d6",
      bonus:  0,
      type:   "slashing",
    };
  }

  function createDefaultPolymorphTrait() {
    return {
      id:          generateId(),
      name:        "",
      description: "",
      active:      false,
    };
  }

  function createDefaultBoss() {
    return {
      bossActive:    false,
      bossHp:        { max: 0, current: 0 },
      defaultHp:     { max: 0, current: 0 },
      bossStatBonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      regeneration:  { amount: 0, disabledBy: [] },
      legendaryActions: 0,
      resistances:   [],
      immunities:    [],
      conditionImmunities: [],
      weaknesses:    [],
      attacks:       [],
      polymorphTraits: [],
      deathRule:     "",
      tamedRule:     "",
    };
  }

  // ─── Roblox-Specific Defaults ──────────────────────────────────────────────

  function createDefaultRobloxCatalogItem() {
    return {
      id:       generateId(),
      name:     "",
      url:      "",
      category: "accessory",
      command:  "hat",
      assetId:  "",
    };
  }

  function createDefaultRoblox() {
    return {
      outfitCommands:          "",
      unparsedOutfitCommands:  [],
      catalogItems:            [],
    };
  }

  // ─── Full Character Defaults ───────────────────────────────────────────────

  /**
   * Create a fresh blank character object.
   * Tabs and sections are enabled explicitly by the editor.
   *
   * @returns {object} A default character object ready to be edited
   */
  function createCharacter() {
    return createBaseCharacter();
  }

  /**
   * Given a character object that may be missing newer optional fields,
   * fill in any missing defaults without overwriting existing data.
   * Useful after loading old characters from the repo.
   *
   * @param {object} character  Loaded character data
   * @returns {object}          Character with defaults applied for missing fields
   */
  function applyDefaults(character) {
    const safeCharacter = character && typeof character === "object" ? character : {};
    const defaults = createBaseCharacter();

    // Fill in only the generic top-level keys required by the editor shell.
    for (const key of Object.keys(defaults)) {
      if (!(key in safeCharacter)) {
        safeCharacter[key] = defaults[key];
      }
    }

    return safeCharacter;
  }

  /**
   * Derive the repo file path from a character's identity name.
   * e.g. "Capella Emerada Lugnica" → "characters/capella-emerada-lugnica.json"
   */
  function deriveRepoPath(characterName) {
    const slug = characterName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `characters/${slug}.json`;
  }

  function getCharacterPresentation(character = {}) {
    const classification = character.identity?.classification || "";
    if (classification && CHARACTER_CLASSIFICATIONS[classification]) {
      return {
        icon: CHARACTER_CLASSIFICATIONS[classification].icon,
        label: CHARACTER_CLASSIFICATIONS[classification].label,
      };
    }

    const hasAnySection = Boolean(
      character.dnd ||
      character.boss ||
      character.roblox ||
      character.spells?.length ||
      character.inventory?.length ||
      character.customResources?.length ||
      character.abilities?.length
    );

    if (!hasAnySection) {
      return {
        icon: "✨",
        label: "Blank Character",
      };
    }

    return {
      icon: "✨",
      label: "Custom Character",
    };
  }

  // ─── Ability Score Helpers ─────────────────────────────────────────────────

  const ABILITY_NAMES = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma",
  };

  const ABILITY_ABBREVIATIONS = {
    str: "STR",
    dex: "DEX",
    con: "CON",
    int: "INT",
    wis: "WIS",
    cha: "CHA",
  };

  function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
  }

  function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  }

  // ─── Skill Definitions ─────────────────────────────────────────────────────

  const SKILLS = [
    { name: "Acrobatics",     ability: "dex" },
    { name: "Animal Handling", ability: "wis" },
    { name: "Arcana",         ability: "int" },
    { name: "Athletics",      ability: "str" },
    { name: "Deception",      ability: "cha" },
    { name: "History",        ability: "int" },
    { name: "Insight",        ability: "wis" },
    { name: "Intimidation",   ability: "cha" },
    { name: "Investigation",  ability: "int" },
    { name: "Medicine",       ability: "wis" },
    { name: "Nature",         ability: "int" },
    { name: "Perception",     ability: "wis" },
    { name: "Performance",    ability: "cha" },
    { name: "Persuasion",     ability: "cha" },
    { name: "Religion",       ability: "int" },
    { name: "Sleight of Hand", ability: "dex" },
    { name: "Stealth",        ability: "dex" },
    { name: "Survival",       ability: "wis" },
  ];

  const SCHOOLS_OF_MAGIC = [
    "Abjuration",
    "Conjuration",
    "Divination",
    "Enchantment",
    "Evocation",
    "Illusion",
    "Necromancy",
    "Transmutation",
  ];

  const DAMAGE_TYPES = [
    "Acid", "Bludgeoning", "Cold", "Fire", "Force",
    "Lightning", "Necrotic", "Piercing", "Poison", "Psychic",
    "Radiant", "Slashing", "Thunder",
  ];

  const ABILITY_TYPES = [
    "passive",
    "action",
    "bonus_action",
    "reaction",
    "legendary",
    "lair",
    "trait",
    "feature",
  ];

  const ABILITY_TYPE_LABELS = {
    passive:      "Passive",
    action:       "Action",
    bonus_action: "Bonus Action",
    reaction:     "Reaction",
    legendary:    "Legendary Action",
    lair:         "Lair Action",
    trait:        "Trait",
    feature:      "Feature",
  };

  const ITEM_TYPES = [
    "weapon",
    "armor",
    "tool",
    "consumable",
    "wondrous",
    "misc",
  ];

  const ROBLOX_CATEGORIES = [
    "hat",
    "hair",
    "face",
    "shirt",
    "pants",
    "accessory",
    "back",
    "neck",
    "shoulder",
    "waist",
    "other",
  ];

  // ─── Section Enable / Remove ───────────────────────────────────────────────

  /**
   * Initialize a named section on a character if it doesn't already exist.
   * @param {object} character
   * @param {"dnd"|"boss"|"roblox"} section
   */
  function enableSection(character, section) {
    if (section === "dnd"    && !character.dnd)    character.dnd    = createDefaultDnd();
    if (section === "boss"   && !character.boss)   character.boss   = createDefaultBoss();
    if (section === "roblox" && !character.roblox) character.roblox = createDefaultRoblox();
  }

  /**
   * Remove a named section from a character entirely.
   * @param {object} character
   * @param {"dnd"|"boss"|"roblox"} section
   */
  function removeSection(character, section) {
    delete character[section];
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    generateId,

    CHARACTER_CLASSIFICATIONS,

    createCharacter,
    applyDefaults,
    deriveRepoPath,
    getCharacterPresentation,

    createDefaultSpell,
    createDefaultAbility,
    createDefaultInventoryItem,
    createDefaultCustomResource,
    createDefaultFeat,
    createDefaultResourceLogEntry,
    createDefaultHpLogEntry,
    createLibraryRecord,
    createLibraryCollection,
    createCharacterLibraryRef,
    normalizeOpen5eSpell,
    createDefaultDnd,
    createDefaultDndStats,
    createDefaultAttack,
    createDefaultDamageRoll,
    createDefaultPolymorphTrait,
    createDefaultBoss,
    createDefaultRoblox,
    createDefaultRobloxCatalogItem,

    enableSection,
    removeSection,

    ABILITY_NAMES,
    ABILITY_ABBREVIATIONS,
    getAbilityModifier,
    formatModifier,

    SKILLS,
    SCHOOLS_OF_MAGIC,
    DAMAGE_TYPES,
    ABILITY_TYPES,
    ABILITY_TYPE_LABELS,
    ITEM_TYPES,
    ROBLOX_CATEGORIES,
  };

})();
