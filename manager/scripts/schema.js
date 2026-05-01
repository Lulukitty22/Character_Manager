/**
 * schema.js
 * Defines default structures for each character type, provides UUID generation,
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

  const CHARACTER_TYPES = {
    DND5E_PC:   "dnd5e_pc",
    DND5E_BOSS: "dnd5e_boss",
    OC:         "oc",
    ROBLOX_OC:  "roblox_oc",
  };

  const CHARACTER_TYPE_LABELS = {
    dnd5e_pc:   "D&D 5e — Player Character",
    dnd5e_boss: "D&D 5e — Boss / NPC",
    oc:         "Original Character",
    roblox_oc:  "Roblox OC",
  };

  const CHARACTER_TYPE_ICONS = {
    dnd5e_pc:   "⚔️",
    dnd5e_boss: "💀",
    oc:         "✨",
    roblox_oc:  "🎮",
  };

  // ─── Default Structures ────────────────────────────────────────────────────

  function createDefaultIdentity() {
    return {
      name:    "",
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
      name:        "",
      level:       0,
      school:      "",
      castingTime: "1 action",
      range:       "",
      components:  [],
      duration:    "",
      description: "",
      prepared:    false,
      tags:        [],
    };
  }

  function createDefaultAbility() {
    return {
      id:          generateId(),
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
      id:   generateId(),
      name: "",
      max:  0,
      current: 0,
      log:  [],
    };
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
    };
  }

  function createDefaultRoblox() {
    return {
      outfitCommands: "",
      catalogItems:   [],
    };
  }

  // ─── Full Character Defaults ───────────────────────────────────────────────

  /**
   * Create a fresh character object of the given type.
   * Type-specific sections (dnd, boss, roblox) are included based on type.
   *
   * @param {string} type  One of CHARACTER_TYPES values
   * @returns {object}     A default character object ready to be edited
   */
  function createCharacter(type = CHARACTER_TYPES.DND5E_PC) {
    const character = {
      id:   generateId(),
      type: type,
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

    if (type === CHARACTER_TYPES.DND5E_PC) {
      character.dnd = createDefaultDnd();
    }

    if (type === CHARACTER_TYPES.DND5E_BOSS) {
      character.boss = createDefaultBoss();
    }

    if (type === CHARACTER_TYPES.ROBLOX_OC) {
      character.roblox = createDefaultRoblox();
    }

    return character;
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
    const defaults = createCharacter(character.type || CHARACTER_TYPES.DND5E_PC);

    // Deep-merge: only fill in top-level keys that are missing
    for (const key of Object.keys(defaults)) {
      if (!(key in character)) {
        character[key] = defaults[key];
      }
    }

    return character;
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

    CHARACTER_TYPES,
    CHARACTER_TYPE_LABELS,
    CHARACTER_TYPE_ICONS,

    createCharacter,
    applyDefaults,
    deriveRepoPath,

    createDefaultSpell,
    createDefaultAbility,
    createDefaultInventoryItem,
    createDefaultCustomResource,
    createDefaultResourceLogEntry,
    createDefaultHpLogEntry,
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
