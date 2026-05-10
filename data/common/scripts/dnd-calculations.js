/**
 * dnd-calculations.js
 * Shared D&D gameplay calculations for hit points, class/race lookups,
 * and spell slot progression.
 */

const DndCalculations = (() => {

  const FULL_CASTER_SLOTS = {
    1:  [2,0,0,0,0,0,0,0,0],
    2:  [3,0,0,0,0,0,0,0,0],
    3:  [4,2,0,0,0,0,0,0,0],
    4:  [4,3,0,0,0,0,0,0,0],
    5:  [4,3,2,0,0,0,0,0,0],
    6:  [4,3,3,0,0,0,0,0,0],
    7:  [4,3,3,1,0,0,0,0,0],
    8:  [4,3,3,2,0,0,0,0,0],
    9:  [4,3,3,3,1,0,0,0,0],
    10: [4,3,3,3,2,0,0,0,0],
    11: [4,3,3,3,2,1,0,0,0],
    12: [4,3,3,3,2,1,0,0,0],
    13: [4,3,3,3,2,1,1,0,0],
    14: [4,3,3,3,2,1,1,0,0],
    15: [4,3,3,3,2,1,1,1,0],
    16: [4,3,3,3,2,1,1,1,0],
    17: [4,3,3,3,2,1,1,1,1],
    18: [4,3,3,3,3,1,1,1,1],
    19: [4,3,3,3,3,2,1,1,1],
    20: [4,3,3,3,3,2,2,1,1],
  };

  const FALLBACK_HIT_DICE = {
    artificer: 8,
    barbarian: 12,
    bard: 8,
    cleric: 8,
    druid: 8,
    fighter: 10,
    monk: 8,
    paladin: 10,
    ranger: 10,
    rogue: 8,
    sorcerer: 6,
    warlock: 8,
    wizard: 6,
  };

  const FALLBACK_CASTER_PROGRESSIONS = {
    artificer: "half-round-up",
    bard: "full",
    cleric: "full",
    druid: "full",
    paladin: "half",
    ranger: "half",
    sorcerer: "full",
    warlock: "pact",
    wizard: "full",
  };

  function calculateHitPoints(character = {}) {
    const dnd = character.dnd || {};
    const stats = dnd.stats || {};
    const conMod = Schema.getAbilityModifier(Number(stats.con?.score ?? 10));
    const race = findRaceRecord(character.identity?.race || dnd.race || "");
    const levels = getClassLevels(dnd);
    const parts = [];
    let total = 0;
    let firstClassApplied = false;

    levels.forEach(entry => {
      const classRecord = findClassRecord(entry.class);
      const hitDie = getHitDie(classRecord, entry.class);
      const level = Math.max(0, Number(entry.level || 0));
      if (!level || !hitDie) return;

      let classHp = 0;
      for (let i = 0; i < level; i += 1) {
        const isFirstCharacterLevel = !firstClassApplied;
        const base = isFirstCharacterLevel ? hitDie : averageHitDie(hitDie);
        classHp += base + conMod;
        if (isFirstCharacterLevel) firstClassApplied = true;
      }

      total += classHp;
      parts.push({
        label: entry.class || "Class",
        value: classHp,
        kind: "positive",
        description: `${level} level${level === 1 ? "" : "s"} using d${hitDie}; CON ${Schema.formatModifier(conMod)} each level.`,
      });
    });

    const raceHp = getRaceHpBonus(race, dnd.level || totalLevel(levels));
    if (raceHp.total) {
      total += raceHp.total;
      parts.push({
        label: race?.name || "Race",
        value: Schema.formatModifier(raceHp.total),
        kind: raceHp.total >= 0 ? "positive" : "negative",
        description: raceHp.description,
      });
    }

    const itemHp = getItemHpBonus(character, dnd.level || totalLevel(levels));
    if (itemHp.total) {
      total += itemHp.total;
      itemHp.parts.forEach(part => parts.push(part));
    }

    return {
      total: Math.max(0, total),
      conMod,
      parts,
      race,
      levels,
    };
  }

  function calculateSpellSlots(character = {}) {
    const dnd = character.dnd || {};
    const levels = getClassLevels(dnd);
    let casterLevel = 0;
    let hasPact = false;
    const parts = [];

    levels.forEach(entry => {
      const classRecord = findClassRecord(entry.class);
      const progression = getCasterProgression(classRecord, entry.class);
      const level = Number(entry.level || 0);
      let contribution = 0;
      if (!level) return;

      if (progression === "full") contribution = level;
      if (progression === "half") contribution = Math.floor(level / 2);
      if (progression === "half-round-up") contribution = Math.ceil(level / 2);
      if (progression === "third") contribution = Math.floor(level / 3);
      if (progression === "pact") hasPact = true;
      casterLevel += contribution;

      if (contribution > 0) {
        parts.push({
          label: entry.class || "Class",
          value: `Caster Lv ${contribution}`,
          kind: "positive",
          description: `${level} level${level === 1 ? "" : "s"} using ${progression} spellcasting progression.`,
        });
      } else if (progression === "pact") {
        parts.push({
          label: entry.class || "Class",
          value: "Pact Magic",
          kind: "neutral",
          description: "Warlock-style pact slots are tracked separately from regular spellcasting slots.",
        });
      }
    });

    casterLevel = Math.max(0, Math.min(20, casterLevel));
    const slots = {};
    (FULL_CASTER_SLOTS[casterLevel] || []).forEach((max, index) => {
      if (max > 0) slots[index + 1] = { max, current: max };
    });

    const itemSlotBonuses = getItemSpellSlotBonuses(character);
    Object.entries(itemSlotBonuses).forEach(([level, bonus]) => {
      const numericLevel = Number(level || 0);
      const max = Number(bonus || 0);
      if (!numericLevel || !max) return;
      if (!slots[numericLevel]) slots[numericLevel] = { max: 0, current: 0 };
      slots[numericLevel].max += max;
      slots[numericLevel].current += max;
      parts.push({
        label: "Item",
        value: `Lv ${numericLevel} ${Schema.formatModifier(max)}`,
        kind: "positive",
        description: "Passive spell-slot bonus from active equipment or carried items.",
      });
    });

    return {
      casterLevel,
      slots,
      parts,
      note: hasPact ? "Pact Magic is tracked manually; this table only covers regular spellcasting slots." : "",
    };
  }

  function getClassLevels(dnd = {}) {
    const multiclass = Array.isArray(dnd.multiclass) ? dnd.multiclass : [];
    const multiclassTotal = multiclass.reduce((sum, entry) => sum + Number(entry.level || 0), 0);
    const totalLevel = Number(dnd.level || 0);
    const primaryLevel = Math.max(0, totalLevel - multiclassTotal);
    const entries = [];

    if (dnd.class && primaryLevel > 0) {
      entries.push({ class: dnd.class, subclass: dnd.subclass || "", level: primaryLevel });
    }

    multiclass.forEach(entry => {
      if (entry.class && Number(entry.level || 0) > 0) {
        entries.push({ class: entry.class, subclass: entry.subclass || "", level: Number(entry.level || 0) });
      }
    });

    if (!entries.length && dnd.class && totalLevel > 0) {
      entries.push({ class: dnd.class, subclass: dnd.subclass || "", level: totalLevel });
    }

    return entries;
  }

  function getHealingItems(character = {}) {
    return getActionableItems(character)
      .filter(item => item.action.effects?.heal || item.action.effects?.tempHp);
  }

  function healingAmount(item = {}) {
    const healing = item.addons?.healing || item.action?.effects?.heal || {};
    if (Number(healing.amount || 0) > 0) return Number(healing.amount);
    if (Number(healing.average || 0) > 0) return Number(healing.average);
    const match = String(healing.dice || item.description || "").match(/(\d+)d(\d+)(?:\s*\+\s*(\d+))?/i);
    if (match) {
      const dice = Number(match[1]);
      const sides = Number(match[2]);
      const bonus = Number(match[3] || 0);
      return Math.floor(dice * ((sides + 1) / 2) + bonus);
    }
    return 0;
  }

  function resolveSpellSlots(character = {}) {
    const calculated = calculateSpellSlots(character);
    const mode = character.spellSlotMode || (Object.keys(character.spellSlotOverrides || {}).length ? "override" : "calculated");
    const overrides = character.spellSlotOverrides || {};
    const storedSlots = character.spellSlots || {};
    const slots = {};

    for (let level = 1; level <= 9; level += 1) {
      const calcMax = calculated.slots[level]?.max || 0;
      const overrideMax = Number(overrides[level] || 0);
      const max = mode === "override" ? Math.max(overrideMax, calcMax, storedSlots[level]?.max || 0) : calcMax;
      const storedCurrent = storedSlots[level]?.current;
      const storedMax = storedSlots[level]?.max;
      const current = max <= 0
        ? 0
        : storedCurrent == null
          ? max
          : Math.max(0, Math.min(Number(storedCurrent || 0), max || Number(storedMax || 0) || max));

      if (max > 0 || overrideMax > 0 || calcMax > 0) {
        slots[level] = {
          max,
          current: current || 0,
          calculatedMax: calcMax,
          overrideMax,
        };
      }
    }

    return {
      ...calculated,
      mode,
      overrideActive: mode === "override",
      overrides,
      slots,
    };
  }

  function resolveTamedHp(character = {}) {
    const dnd = character.dnd || {};
    const hp = dnd.hp || {};
    const legacyBossDefault = character.boss?.defaultHp || {};
    const calc = calculateHitPoints(character);
    const calculatedMax = Math.max(0, Number(calc.total || 0));
    const hasCalculatedMax = calculatedMax > 0 || (calc.parts || []).length > 0;
    const storedMode = hp.mode || legacyBossDefault.mode || (hasCalculatedMax ? "calculated" : "override");
    const storedOverrideMax = Math.max(0, Number(hp.max ?? legacyBossDefault.max ?? 0));
    const overrideActive = storedMode === "override" || (!hasCalculatedMax && storedOverrideMax > 0);
    const effectiveMax = overrideActive
      ? storedOverrideMax
      : (hasCalculatedMax ? calculatedMax : storedOverrideMax);
    const rawCurrent = hp.current ?? legacyBossDefault.current ?? 0;
    const migratedCurrent = !overrideActive
      && hasCalculatedMax
      && storedOverrideMax > 0
      && Number(rawCurrent || 0) === storedOverrideMax
      ? calculatedMax
      : rawCurrent;

    return {
      current: Math.max(0, Number(migratedCurrent || 0)),
      max: Math.max(0, Number(effectiveMax || 0)),
      temp: Math.max(0, Number(hp.temp || 0)),
      mode: overrideActive ? "override" : "calculated",
      overrideActive,
      storedOverrideMax,
      calculatedMax,
      hasCalculatedMax,
      calculation: calc,
    };
  }

  function getActiveHp(character = {}, bossActive = null) {
    const boss = character.boss || null;
    const activeBoss = bossActive == null ? Boolean(boss?.bossActive) : Boolean(bossActive);
    if (boss && activeBoss) {
      return normalizeHpPool(boss.bossHp || {});
    }
    return resolveTamedHp(character);
  }

  function syncBossDefaultHp(character = {}) {
    if (!character?.boss) return character;
    const tamedHp = resolveTamedHp(character);
    character.boss.defaultHp = {
      ...(character.boss.defaultHp || {}),
      mode: tamedHp.mode,
      max: tamedHp.max,
      current: tamedHp.current,
    };
    return character;
  }

  function getResolvedInventory(character = {}) {
    return (character.inventory || []).map(item => typeof Library !== "undefined" ? Library.resolveRef(item) : item);
  }

  function getItemHpBonus(character = {}, level = 0) {
    const parts = [];
    let total = 0;

    getResolvedInventory(character).forEach(item => {
      if (!itemAppliesPassively(item)) return;
      const hp = item.addons?.effects?.hp || {};
      const flat = Number(hp.flatBonus || hp.maxFlatBonus || 0);
      const perLevel = Number(hp.perLevelBonus || 0);
      const bonusTotal = flat + perLevel * Number(level || 0);
      if (!bonusTotal) return;
      total += bonusTotal;
      parts.push({
        label: item.name || "Item",
        value: Schema.formatModifier(bonusTotal),
        kind: bonusTotal >= 0 ? "positive" : "negative",
        description: [
          flat ? `${Schema.formatModifier(flat)} flat max HP` : "",
          perLevel ? `${Schema.formatModifier(perLevel)} per level` : "",
          item.attuned ? "Requires attunement." : "",
        ].filter(Boolean).join("; "),
      });
    });

    return { total, parts };
  }

  function getItemSpellSlotBonuses(character = {}) {
    return getResolvedInventory(character).reduce((bonuses, item) => {
      if (!itemAppliesPassively(item)) return bonuses;
      const slotBonuses = item.addons?.effects?.spellSlots?.bonusByLevel || {};
      Object.entries(slotBonuses).forEach(([level, value]) => {
        const numericLevel = Number(level || 0);
        if (!numericLevel) return;
        bonuses[numericLevel] = (bonuses[numericLevel] || 0) + Number(value || 0);
      });
      return bonuses;
    }, {});
  }

  function getActionableItems(character = {}) {
    return getResolvedInventory(character)
      .filter(item => Number(item.quantity ?? 1) > 0)
      .flatMap(item => {
        const explicitActions = Array.isArray(item.addons?.actions) ? item.addons.actions : [];
        const normalizedActions = explicitActions
          .map(action => normalizeItemAction(item, action))
          .filter(Boolean);

        if (normalizedActions.length) {
          return normalizedActions.map(action => ({ ...item, action }));
        }

        const inferred = inferDefaultItemAction(item);
      return inferred ? [{ ...item, action: inferred }] : [];
      });
  }

  function evaluateItemActionState(character = {}, item = {}) {
    const resourceEffects = Array.isArray(item?.action?.effects?.resources)
      ? item.action.effects.resources
      : [];
    const inventoryEffects = Array.isArray(item?.action?.effects?.inventory)
      ? item.action.effects.inventory
      : [];

    const resources = resourceEffects
      .map(effect => resolveResourceEffectTarget(character, effect))
      .filter(Boolean);
    const inventory = inventoryEffects
      .map(effect => resolveInventoryEffectTarget(character, effect))
      .filter(Boolean);

    const resourceBlocker = resources.find(entry => entry.shortage || entry.missing || entry.blocked);
    if (resourceBlocker) {
      return {
        ok: false,
        resources,
        inventory,
        message: resourceBlocker.missing
          ? `${item?.name || "This action"} requires ${resourceBlocker.name.toLowerCase()}, but it is not available.`
          : resourceBlocker.blocked
            ? `${resourceBlocker.name} is already full.`
            : `${item?.name || "This action"} needs ${resourceBlocker.required} ${resourceBlocker.name.toLowerCase()} but only ${resourceBlocker.current} remain.`,
      };
    }

    const inventoryShortage = inventory.find(entry => entry.shortage || entry.missing);
    if (inventoryShortage) {
      return {
        ok: false,
        resources,
        inventory,
        message: inventoryShortage.missing
          ? `${item?.name || "This action"} requires ${inventoryShortage.name.toLowerCase()}, but it is not in inventory.`
          : `${item?.name || "This action"} needs ${inventoryShortage.required} ${inventoryShortage.name.toLowerCase()} but only ${inventoryShortage.current} are available.`,
      };
    }

    return { ok: true, resources, inventory, message: "" };
  }

  function resolveResourceEffectTarget(character = {}, effect = {}) {
    const target = String(effect.target || effect.resourceName || "").trim().toLowerCase();
    if (!target) return null;
    const delta = Number(effect.delta || 0);
    const required = delta < 0 ? Math.abs(delta) : 0;
    const resource = (character.customResources || []).find(entry => {
      const resolved = typeof Library !== "undefined" ? Library.resolveRef(entry) : entry;
      return [entry.id, entry.libraryRef, entry.name, resolved?.name]
        .filter(Boolean)
        .some(value => String(value).trim().toLowerCase() === target);
    }) || null;
    if (!resource) {
      return {
        name: effect.target || effect.resourceName || "Resource",
        current: 0,
        max: 0,
        cap: 0,
        delta,
        required,
        shortage: required > 0,
        missing: true,
      };
    }
    const resolved = typeof Library !== "undefined" ? Library.resolveRef(resource) : resource;
    const max = Number(resource.max ?? resolved?.max ?? 0);
    const cap = effect.maxCap != null ? Number(effect.maxCap) : max;
    const current = Number(resource.current ?? resolved?.current ?? 0);
      return {
        name: resolved?.name || effect.target || effect.resourceName || "Resource",
        current,
        max,
        cap,
        delta,
        required,
        shortage: required > 0 && current < required,
        blocked: Number(effect.delta || 0) > 0 && cap > 0 && current >= cap,
      missing: false,
      resource,
    };
  }

  function resolveInventoryEffectTarget(character = {}, effect = {}) {
    const target = String(effect.target || effect.itemName || effect.itemRef || "").trim().toLowerCase();
    if (!target) return null;
    const delta = Number(effect.delta || 0);
    const mustExist = Boolean(effect.mustExist || effect.requirePresence);
    const required = effect.required != null
      ? Math.max(0, Number(effect.required || 0))
      : delta < 0 ? Math.abs(delta) : 0;
    const inventoryItem = getResolvedInventory(character).find(entry => {
      return [entry.id, entry.libraryRef, entry.name]
        .filter(Boolean)
        .some(value => String(value).trim().toLowerCase() === target);
    }) || null;
    if (!inventoryItem) {
        return {
          name: effect.target || effect.itemName || effect.itemRef || "Item",
          current: 0,
          delta,
          required,
          shortage: required > 0 || mustExist,
          missing: true,
        mustExist,
      };
    }
    const current = Number(inventoryItem.quantity ?? 0);
      return {
        name: inventoryItem.name || effect.target || "Item",
        current,
        delta,
        required,
        shortage: required > 0 && current < required,
        missing: false,
      mustExist,
      item: inventoryItem,
    };
  }

  function normalizeItemAction(item, action = {}) {
    if (!action || typeof action !== "object") return null;
    const resourceEffects = Array.isArray(action.effects?.resources)
      ? action.effects.resources
      : [];
    return {
      label: action.label || inferActionLabel(item, action.effects || {}),
      consumeQuantity: action.consumeQuantity ?? action.usesQuantity ?? (item.type === "consumable"),
      effects: {
        ...(action.effects || {}),
        ...(resourceEffects.length ? { resources: resourceEffects } : {}),
      },
      description: action.description || action.note || "",
    };
  }

  function inferDefaultItemAction(item = {}) {
    if (item.addons?.inventory?.suppressGameplayAction) return null;
    const heal = item.addons?.healing ? { ...item.addons.healing } : null;
    const passiveHp = item.addons?.effects?.hp || {};
    const tempHp = Number(passiveHp.tempHp || 0);

    if (heal || tempHp) {
      return {
        label: inferActionLabel(item, { heal, tempHp }),
        consumeQuantity: item.type === "consumable",
        effects: {
          ...(heal ? { heal } : {}),
          ...(tempHp ? { tempHp: { amount: tempHp } } : {}),
        },
        description: item.description || "",
      };
    }

    if (item.type === "ammo" || (item.tags || []).some(tag => /ammo|arrow|bolt/i.test(tag))) {
      return {
        label: "Spend 1",
        consumeQuantity: true,
        effects: {},
        description: "Reduce quantity by 1.",
      };
    }

    return null;
  }

  function inferActionLabel(item = {}, effects = {}) {
    if (effects.heal) return item.type === "consumable" ? "Drink" : "Use";
    if (effects.tempHp) return "Use";
    if (Array.isArray(effects.resources) && effects.resources.some(effect => Number(effect.delta || 0) < 0)) return "Use";
    if (Array.isArray(effects.resources) && effects.resources.some(effect => Number(effect.delta || 0) > 0)) return "Restore";
    if (item.type === "ammo") return "Spend 1";
    return "Use";
  }

  function itemAppliesPassively(item = {}) {
    return Number(item.quantity ?? 1) > 0
      && item.active !== false
      && (!item.addons?.requiresAttunement || item.attuned || item.active);
  }

  function findClassRecord(name) {
    return findLibraryRecord("classes", name);
  }

  function findRaceRecord(name) {
    return findLibraryRecord("species", name);
  }

  function findLibraryRecord(collection, name) {
    const clean = comparableName(name);
    if (!clean || typeof Library === "undefined") return null;
    return Library.list(collection).find(entry =>
      comparableName(entry.name) === clean ||
      comparableName(entry.id) === clean ||
      (entry.tags || []).some(tag => comparableName(tag) === clean)
    ) || null;
  }

  function getHitDie(classRecord, className) {
    const value = classRecord?.hitDie || classRecord?.addons?.hp?.hitDie || "";
    const match = String(value).match(/d?(\d+)/i);
    if (match) return Number(match[1]);
    return FALLBACK_HIT_DICE[comparableName(className)] || 8;
  }

  function getCasterProgression(classRecord, className) {
    return classRecord?.addons?.spellcasting?.progression
      || classRecord?.features?.spellcastingProgression?.progression
      || FALLBACK_CASTER_PROGRESSIONS[comparableName(className)]
      || "none";
  }

  function normalizeHpPool(pool = {}) {
    return {
      current: Math.max(0, Number(pool.current || 0)),
      max: Math.max(0, Number(pool.max || 0)),
      temp: Math.max(0, Number(pool.temp || 0)),
    };
  }

  function getRaceHpBonus(race, level) {
    const hp = race?.addons?.hp || {};
    const flat = Number(hp.flatBonus || hp.bonus || 0);
    const perLevel = Number(hp.perLevelBonus || 0);
    const total = flat + perLevel * Number(level || 0);
    const parts = [];
    if (flat) parts.push(`${Schema.formatModifier(flat)} flat`);
    if (perLevel) parts.push(`${Schema.formatModifier(perLevel)} per level`);
    return {
      total,
      description: parts.length ? parts.join("; ") : "",
    };
  }

  function averageHitDie(hitDie) {
    return Math.floor(Number(hitDie || 0) / 2) + 1;
  }

  function totalLevel(levels) {
    return levels.reduce((sum, entry) => sum + Number(entry.level || 0), 0);
  }

  function comparableName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return {
    calculateHitPoints,
    calculateSpellSlots,
    resolveSpellSlots,
    getClassLevels,
    getHealingItems,
    getActionableItems,
    evaluateItemActionState,
    resolveResourceEffectTarget,
    resolveInventoryEffectTarget,
    healingAmount,
    resolveTamedHp,
    getActiveHp,
    syncBossDefaultHp,
    findClassRecord,
    findRaceRecord,
  };

})();
