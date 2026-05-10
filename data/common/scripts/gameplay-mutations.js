const GameplayMutations = (() => {

  function applyItemAction(character = {}, item = {}, quantity = 1) {
    const multiplier = Math.max(1, Number(quantity || 1) || 1);
    const actionState = typeof DndCalculations !== "undefined"
      ? DndCalculations.evaluateItemActionState(character, item)
      : { ok: true, resources: [], inventory: [], message: "" };

    if (!actionState.ok) {
      return {
        ok: false,
        didAnything: false,
        message: actionState.message || `Cannot use ${item.name || "item"} right now.`,
        actionState,
      };
    }

    const effects = item.action?.effects || {};
    const healAmount = effects.heal ? DndCalculations.healingAmount({
      action: { effects },
      addons: { healing: effects.heal },
      description: item.description,
    }) * multiplier : 0;
    const tempHp = Number(effects.tempHp?.amount || effects.tempHp || 0) * multiplier;
    const slotEffect = effects.spellSlots || null;

    let didAnything = false;
    let hpDelta = 0;
    let slotDelta = 0;

    if (healAmount > 0) {
      hpDelta += adjustHp(character, healAmount, item.name || "Item");
      didAnything = didAnything || hpDelta !== 0;
    }

    if (tempHp > 0) {
      const tempResult = applyTempHp(character, tempHp, `${item.name || "Item"} granted ${tempHp} temp HP`);
      didAnything = didAnything || tempResult.didAnything;
    }

    if (slotEffect?.all) {
      slotDelta += restoreAllSlots(character, item.name || "Item restored all spell slots");
      didAnything = didAnything || slotDelta !== 0;
    } else if (slotEffect?.level) {
      slotDelta += adjustSpellSlot(character, Number(slotEffect.level || 0), Math.max(1, Number(slotEffect.amount || 1)) * multiplier, item.name || "Item restored a spell slot");
      didAnything = didAnything || slotDelta !== 0;
    }

    (effects.resources || []).forEach(effect => {
      if (applyResourceEffect(character, scaleEffect(effect, multiplier))) didAnything = true;
    });

    (effects.inventory || []).forEach(effect => {
      if (applyInventoryEffect(character, scaleEffect(effect, multiplier))) didAnything = true;
    });

    if (item.action?.consumeQuantity) {
      if (decrementInventoryItem(character, item.id || item.libraryRef || item.name, multiplier)) didAnything = true;
    }

    return {
      ok: true,
      didAnything,
      hpDelta,
      slotDelta,
      actionState,
      item,
      message: didAnything
        ? `${item.action?.label || "Used"} ${item.name || "item"}${multiplier > 1 ? ` x${multiplier}` : ""}.`
        : `${item.name || "Item"} had no effect.`,
    };
  }

  function adjustHp(character = {}, delta = 0, reason = "") {
    if (!character.dnd) character.dnd = {};
    if (!character.dnd.hp) character.dnd.hp = { mode: "calculated", max: 0, current: 0, temp: 0, log: [] };
    if (!Array.isArray(character.dnd.hp.log)) character.dnd.hp.log = [];

    const hpState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : {
        current: Number(character.dnd.hp.current || 0),
        max: Number(character.dnd.hp.max || 0),
      };

    const current = Math.max(0, Number(hpState.current || 0));
    const max = Math.max(0, Number(hpState.max || character.dnd.hp.max || 0));
    const next = Math.max(0, Math.min(max, current + Number(delta || 0)));
    const applied = next - current;

    if (applied === 0) return 0;

    character.dnd.hp.current = next;
    if (max > 0 && !character.dnd.hp.max) character.dnd.hp.max = max;
    character.dnd.hp.log.push(Schema.createDefaultHpLogEntry(applied, reason || (applied > 0 ? "Healing" : "Damage")));
    return applied;
  }

  function applyTempHp(character = {}, amount = 0, reason = "") {
    if (!character.dnd) character.dnd = {};
    if (!character.dnd.hp) character.dnd.hp = { mode: "calculated", max: 0, current: 0, temp: 0, log: [] };
    if (!Array.isArray(character.dnd.hp.log)) character.dnd.hp.log = [];

    const current = Math.max(0, Number(character.dnd.hp.temp || 0));
    const next = Math.max(current, Math.max(0, Number(amount || 0)));
    if (next === current) return { didAnything: false, nextTemp: current };

    character.dnd.hp.temp = next;
    character.dnd.hp.log.push(Schema.createDefaultHpLogEntry(0, reason || `Temp HP set to ${next}`));
    return { didAnything: true, nextTemp: next };
  }

  function adjustSpellSlot(character = {}, level = 0, delta = 0, reason = "") {
    const numericLevel = Math.max(0, Number(level || 0));
    if (!numericLevel) return 0;
    if (!character.spellSlots) character.spellSlots = {};
    if (!Array.isArray(character.spellSlotLog)) character.spellSlotLog = [];

    const slotState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveSpellSlots(character)
      : { slots: {} };
    const slot = slotState.slots?.[numericLevel] || { max: 0, current: 0 };
    const max = Math.max(0, Number(slot.max || 0));
    if (max <= 0) return 0;

    const current = Math.max(0, Number(slot.current || 0));
    const next = Math.max(0, Math.min(max, current + Number(delta || 0)));
    const applied = next - current;
    if (applied === 0) return 0;

    character.spellSlots[numericLevel] = {
      ...(character.spellSlots[numericLevel] || {}),
      max,
      current: next,
    };
    character.spellSlotLog.push({
      id: Schema.generateId(),
      date: new Date().toISOString().slice(0, 10),
      level: numericLevel,
      reason: reason || (applied > 0 ? `Restored level ${numericLevel} slot` : `Used level ${numericLevel} slot`),
    });
    return applied;
  }

  function restoreAllSlots(character = {}, reason = "Restored all spell slots") {
    if (!character.spellSlots) character.spellSlots = {};
    if (!Array.isArray(character.spellSlotLog)) character.spellSlotLog = [];

    const slotState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveSpellSlots(character)
      : { slots: {} };
    let changed = 0;

    for (let level = 1; level <= 9; level += 1) {
      const slot = slotState.slots?.[level];
      const max = Math.max(0, Number(slot?.max || 0));
      if (max <= 0) continue;
      const current = Math.max(0, Number(slot?.current || 0));
      if (current === max) continue;
      character.spellSlots[level] = {
        ...(character.spellSlots[level] || {}),
        max,
        current: max,
      };
      changed += Math.abs(max - current);
    }

    if (changed > 0) {
      character.spellSlotLog.push({
        id: Schema.generateId(),
        date: new Date().toISOString().slice(0, 10),
        level: 0,
        reason,
      });
    }
    return changed;
  }

  function applyResourceEffect(character = {}, effect = {}) {
    const target = resolveResourceTarget(character, effect);
    if (!target?.resource) return false;

    const delta = Number(effect.delta || 0);
    const resource = target.resource;
    const current = Math.max(0, Number(resource.current ?? 0));
    const maxCap = effect.maxCap != null
      ? Math.max(0, Number(effect.maxCap || 0))
      : Math.max(0, Number(resource.max ?? target.max ?? 0));
    const next = maxCap > 0
      ? Math.max(0, Math.min(current + delta, maxCap))
      : Math.max(0, current + delta);
    const applied = next - current;
    if (applied === 0) return false;

    resource.current = next;
    if (!Array.isArray(resource.log)) resource.log = [];
    resource.log.push(Schema.createDefaultResourceLogEntry(applied, effect.reason || "Item action"));
    return true;
  }

  function applyInventoryEffect(character = {}, effect = {}) {
    const target = resolveInventoryTarget(character, effect);
    if (!target?.item) return false;
    const delta = Number(effect.delta || 0);
    const current = Math.max(0, Number(target.item.quantity ?? 0));
    const next = Math.max(0, current + delta);
    const applied = next - current;
    if (applied === 0) return false;
    target.item.quantity = next;
    return true;
  }

  function decrementInventoryItem(character = {}, itemTarget = "", quantity = 1) {
    const target = resolveInventoryTarget(character, { target: itemTarget, delta: -1 });
    if (!target?.item) return false;
    const current = Math.max(0, Number(target.item.quantity ?? 0));
    if (current <= 0) return false;
    target.item.quantity = Math.max(0, current - Math.max(1, Number(quantity || 1) || 1));
    return true;
  }

  function scaleEffect(effect = {}, multiplier = 1) {
    const scaled = { ...effect };
    if (effect.delta != null) scaled.delta = Number(effect.delta || 0) * multiplier;
    if (effect.required != null) scaled.required = Number(effect.required || 0) * multiplier;
    return scaled;
  }

  function resolveInventoryTarget(character = {}, effect = {}) {
    const target = String(effect.target || effect.itemName || effect.itemRef || "").trim().toLowerCase();
    if (!target) return null;
    const item = (character.inventory || []).find(entry => {
      const resolved = typeof Library !== "undefined" ? Library.resolveRef(entry) : entry;
      return [
        entry.id,
        entry.libraryRef,
        entry.name,
        resolved?.id,
        resolved?.libraryRef,
        resolved?.name,
      ].filter(Boolean).some(value => String(value).trim().toLowerCase() === target);
    }) || null;

    if (!item) return null;
    const resolved = typeof Library !== "undefined" ? Library.resolveRef(item) : item;
    return { item, resolved };
  }

  function resolveResourceTarget(character = {}, effect = {}) {
    const target = String(effect.target || effect.resourceName || "").trim().toLowerCase();
    if (!target) return null;
    const resource = (character.customResources || []).find(entry => {
      const resolved = typeof Library !== "undefined" ? Library.resolveRef(entry) : entry;
      return [
        entry.id,
        entry.libraryRef,
        entry.name,
        resolved?.name,
      ].filter(Boolean).some(value => String(value).trim().toLowerCase() === target);
    }) || null;

    if (!resource) return null;
    const resolved = typeof Library !== "undefined" ? Library.resolveRef(resource) : resource;
    return {
      resource,
      resolved,
      max: Number(resource.max ?? resolved?.max ?? 0),
    };
  }

  return {
    applyItemAction,
    adjustHp,
    applyTempHp,
    adjustSpellSlot,
    restoreAllSlots,
    applyResourceEffect,
    applyInventoryEffect,
    decrementInventoryItem,
  };

})();

if (typeof globalThis !== "undefined") globalThis.GameplayMutations = GameplayMutations;
