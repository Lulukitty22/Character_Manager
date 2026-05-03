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

    levels.forEach(entry => {
      const classRecord = findClassRecord(entry.class);
      const progression = getCasterProgression(classRecord, entry.class);
      const level = Number(entry.level || 0);
      if (!level) return;

      if (progression === "full") casterLevel += level;
      if (progression === "half") casterLevel += Math.floor(level / 2);
      if (progression === "half-round-up") casterLevel += Math.ceil(level / 2);
      if (progression === "third") casterLevel += Math.floor(level / 3);
      if (progression === "pact") hasPact = true;
    });

    casterLevel = Math.max(0, Math.min(20, casterLevel));
    const slots = {};
    (FULL_CASTER_SLOTS[casterLevel] || []).forEach((max, index) => {
      if (max > 0) slots[index + 1] = { max, current: max };
    });

    return {
      casterLevel,
      slots,
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
    return (character.inventory || [])
      .map(item => typeof Library !== "undefined" ? Library.resolveRef(item) : item)
      .filter(item => {
        const text = [item.name, item.type, item.description, item.tags || [], item.addons?.healing?.dice, item.addons?.healing?.amount]
          .flat()
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return Number(item.quantity ?? 1) > 0 && (
          item.addons?.healing ||
          item.type === "consumable" ||
          /\bheal|healing|potion|restores?\b/.test(text)
        );
      });
  }

  function healingAmount(item = {}) {
    const healing = item.addons?.healing || {};
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

  function findClassRecord(name) {
    return findLibraryRecord("classes", name);
  }

  function findRaceRecord(name) {
    return findLibraryRecord("races", name);
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
    return classRecord?.addons?.spellcasting?.progression || FALLBACK_CASTER_PROGRESSIONS[comparableName(className)] || "none";
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
    getClassLevels,
    getHealingItems,
    healingAmount,
    findClassRecord,
    findRaceRecord,
  };

})();
