/**
 * view-character-inventory.js
 * Inventory and currency section rendering.
 */

const ViewCharacterInventory = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderOvhChips = ViewCharacterUtils.renderOvhChips;

  function render(character, inventory, currency) {
    const items = inventory || [];
    const funds = currency || {};
    if (!items.length && !Object.values(funds).some(v => v > 0)) return "";

    const actionableById = typeof DndCalculations !== "undefined"
      ? DndCalculations.getActionableItems(character).reduce((map, item) => {
        if (!map[item.id]) map[item.id] = [];
        map[item.id].push(item);
        return map;
      }, {})
      : {};

    const rows = items.map((item, index) => renderItemRow(item, actionableById[item.id] || [], index)).join("");
    const currencyPills = renderCurrency(funds);

    return `
      <section class="ovh-section ovh-inventory-section">
        <div class="ovh-section-header">
          <h2>Inventory</h2>
        </div>
        ${currencyPills ? `<div class="ovh-card ovh-currency-row">${currencyPills}</div>` : ""}
        ${rows ? `
          <div class="ovh-record-group">
            <p class="ovh-group-label">Carried Items <span class="count">${items.length}</span></p>
            ${rows}
          </div>
        ` : ""}
      </section>
    `;
  }

  function renderItemRow(item, actions, index) {
    const resourceChips = actions.flatMap(actionEntry => (actionEntry.action?.effects?.resources || []).map(effect => ({
      label: effect.target || effect.resourceName || "Resource",
      value: Schema.formatModifier(Number(effect.delta || 0)),
      kind: Number(effect.delta || 0) >= 0 ? "positive" : "negative",
      description: effect.reason || actionEntry.action?.description || "",
    })));

    const mechanics = [
      item.quantity != null && item.quantity !== 1 ? { label: "Qty", value: item.quantity, kind: "quantity" } : null,
      item.type ? { label: "Type", value: item.type, kind: "neutral" } : null,
      item.weight != null && item.weight !== "" ? { label: "Weight", value: item.weight, kind: "neutral" } : null,
      item.active === false ? { label: "Inactive", kind: "negative", description: "This item is currently not equipped or not applying passive effects." } : { label: "Active", kind: "positive" },
      item.attuned ? {
        label: "Attuned",
        kind: "requirement",
        description: "This item is attuned or requires attunement for its full effects.",
      } : null,
      item.addons?.equipment?.slot ? { label: "Slot", value: item.addons.equipment.slot, kind: "neutral" } : null,
      item.addons?.equipment?.rarity ? { label: "Rarity", value: item.addons.equipment.rarity, kind: "positive" } : null,
      item.addons?.effects?.hp?.flatBonus ? { label: "Max HP", value: Schema.formatModifier(Number(item.addons.effects.hp.flatBonus || 0)), kind: "positive" } : null,
      item.addons?.effects?.hp?.perLevelBonus ? { label: "HP / Lv", value: Schema.formatModifier(Number(item.addons.effects.hp.perLevelBonus || 0)), kind: "positive" } : null,
      item.addons?.effects?.hp?.tempHp ? { label: "Temp HP", value: `+${Number(item.addons.effects.hp.tempHp || 0)}`, kind: "positive" } : null,
      item.addons?.healing ? { label: "Healing", value: `+${DndCalculations.healingAmount(item)}`, kind: "positive" } : null,
      ...resourceChips,
      ...(item.addons?.mechanics || []),
    ].filter(Boolean);

    const subtitle = [item.type || "Item", item.addons?.equipment?.rarity || "", item.attuned ? "Attuned" : ""]
      .filter(Boolean)
      .join(" | ");
    const quantity = Number(item.quantity ?? 1);
    const openAttr = actions.length || index < 2 ? " open" : "";
    const stateClass = item.active === false ? "" : "prepared";
    const actionButtons = actions.map((actionEntry, actionIndex) => `
      <button type="button" class="ovh-view-button ovh-action-button sheet-use-item-action" data-item-id="${ViewCharacterUtils.escAttr(item.id)}" data-action-index="${actionIndex}">
        ${esc(actionEntry.action?.label || "Use")}
      </button>
    `).join("");
    const tags = renderOvhChips((item.tags || []).map(tag => ({ label: tag, kind: "neutral" })), { className: "ovh-chips tag-row" });

    return `
      <details class="ovh-record ovh-item-record sheet-record-card" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildItemViewerRecord(item, mechanics, actions))}"${openAttr}>
        <summary>
          <span class="ovh-status-dot ${stateClass}"></span>
          <div class="title-block">
            <div class="title">
              ${esc(item.name || "(Unnamed Item)")}
              ${subtitle ? `<span class="sub">${esc(subtitle)}</span>` : ""}
            </div>
            ${renderOvhChips(mechanics, { className: "ovh-chips quick-chips" })}
          </div>
          ${quantity > 1 ? `<span class="ovh-quantity-badge">x${esc(quantity)}</span>` : ""}
          <button type="button" class="ovh-view-button sheet-open-record-viewer">View</button>
        </summary>
        <div class="body">
          ${item.description ? `<p class="desc">${esc(item.description)}</p>` : ""}
          ${actionButtons ? `<div class="ovh-action-row">${actionButtons}</div>` : ""}
          ${tags}
        </div>
      </details>
    `;
  }

  function renderCurrency(funds = {}) {
    const currencyOrder = [["pp", "Platinum"], ["gp", "Gold"], ["ep", "Electrum"], ["sp", "Silver"], ["cp", "Copper"]];
    return currencyOrder
      .filter(([key]) => (funds[key] || 0) > 0)
      .map(([key, label]) => `
        <span class="ovh-currency-pill">
          <span class="amount">${esc(funds[key])}</span>
          <span class="label">${esc(label)}</span>
        </span>
      `).join("");
  }

  function buildItemViewerRecord(item, mechanics, actions) {
    const sections = [];
    if (actions.length) {
      sections.push({
        title: "Actions",
        content: actions.map(entry => {
          const effects = [];
          if (entry.action?.effects?.heal) effects.push(`Healing: +${DndCalculations.healingAmount(entry)}`);
          if (entry.action?.effects?.tempHp) effects.push(`Temp HP: +${Number(entry.action.effects.tempHp.amount || entry.action.effects.tempHp || 0)}`);
          (entry.action?.effects?.resources || []).forEach(effect => {
            effects.push(`${effect.target || effect.resourceName || "Resource"} ${Schema.formatModifier(Number(effect.delta || 0))}`);
          });
          if (entry.action?.effects?.spellSlots?.all) effects.push("Restore all spell slots");
          if (entry.action?.effects?.spellSlots?.level) effects.push(`Restore level ${entry.action.effects.spellSlots.level} slots by ${entry.action.effects.spellSlots.amount || 1}`);
          return `${entry.action?.label || "Use"}${effects.length ? `: ${effects.join("; ")}` : ""}`;
        }).join("\n"),
      });
    }

    return {
      kicker: "Item",
      title: item.name || "(Unnamed Item)",
      subtitle: [item.type || "misc", item.addons?.equipment?.rarity || ""].filter(Boolean).join(" | "),
      description: item.description || "",
      chips: mechanics,
      sections,
      raw: item,
    };
  }

  function wireInteractive(containerEl, character) {
    containerEl.querySelectorAll(".ovh-item-record .sheet-open-record-viewer").forEach(button => {
      if (button.dataset.viewerWired === "true") return;
      button.dataset.viewerWired = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest(".ovh-item-record");
        ViewCharacterUtils.openRecordViewer(ViewCharacterUtils.decodeDataAttr(row?.dataset.sheetRecord, {}));
      });
    });

    containerEl.querySelectorAll(".sheet-use-item-action").forEach(button => {
      if (button.dataset.actionWired === "true") return;
      button.dataset.actionWired = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const itemId = button.dataset.itemId || "";
        const actionIndex = parseInt(button.dataset.actionIndex || "0", 10) || 0;
        useItemAction(containerEl, character, itemId, actionIndex);
      });
    });
  }

  function useItemAction(containerEl, character, itemId, actionIndex) {
    if (typeof DndCalculations === "undefined") return;
    const actionable = DndCalculations.getActionableItems(character).filter(item => item.id === itemId);
    const item = actionable[actionIndex];
    if (!item) return;

    const effects = item.action?.effects || {};
    const resourceError = applyResourceEffects(character, effects.resources || []);
    if (resourceError) {
      ViewCharacterUtils.showToast(resourceError, "error");
      return;
    }

    applyHpEffects(character, effects);
    applySpellSlotEffects(character, effects);

    if (item.action?.consumeQuantity) {
      const inventoryItem = (character.inventory || []).find(entry => entry.id === item.id);
      if (inventoryItem) {
        inventoryItem.quantity = Math.max(0, Number(inventoryItem.quantity ?? 1) - 1);
      }
    }

    if (typeof DndCalculations !== "undefined") DndCalculations.syncBossDefaultHp(character);
    rerenderSheet(containerEl, character);
    ViewCharacterUtils.showToast(`${item.action?.label || "Used"} ${item.name || "item"}.`, "success");
  }

  function applyResourceEffects(character, effects = []) {
    for (const effect of effects) {
      const resource = findResource(character, effect);
      if (!resource) {
        return `Could not find resource "${effect.target || effect.resourceName || "resource"}".`;
      }
      const delta = Number(effect.delta || 0);
      const maxCap = effect.maxCap != null ? Number(effect.maxCap) : Number(resource.max || 0);
      const next = Number(resource.current || 0) + delta;
      if (delta < 0 && next < 0) {
        return `${resource.name || "Resource"} is too low.`;
      }
      resource.current = Math.max(0, maxCap > 0 ? Math.min(next, maxCap) : next);
      if (!resource.log) resource.log = [];
      resource.log.push(Schema.createDefaultResourceLogEntry(delta, effect.reason || "Item action"));
    }
    return "";
  }

  function findResource(character, effect = {}) {
    const target = String(effect.target || effect.resourceName || "").trim().toLowerCase();
    return (character.customResources || []).find(entry => {
      const resolved = typeof Library !== "undefined" ? Library.resolveRef(entry) : entry;
      return [entry.id, entry.libraryRef, entry.name, resolved?.name]
        .filter(Boolean)
        .some(value => String(value).trim().toLowerCase() === target);
    }) || null;
  }

  function applyHpEffects(character, effects = {}) {
    const healAmount = effects.heal ? DndCalculations.healingAmount({ action: { effects }, addons: { healing: effects.heal }, description: "" }) : 0;
    const tempHp = Number(effects.tempHp?.amount || effects.tempHp || 0);
    const activeHp = character.boss?.bossActive ? (character.boss.bossHp || {}) : (character.dnd?.hp || {});
    if (healAmount > 0) {
      activeHp.current = Math.max(0, Math.min(Number(activeHp.current || 0) + healAmount, Number(activeHp.max || 0) || Number(activeHp.current || 0) + healAmount));
      if (!character.boss?.bossActive && character.dnd?.hp?.log) {
        character.dnd.hp.log.push(Schema.createDefaultHpLogEntry(healAmount, "Item use"));
      }
    }
    if (tempHp > 0 && character.dnd?.hp) {
      character.dnd.hp.temp = Math.max(Number(character.dnd.hp.temp || 0), tempHp);
      character.dnd.hp.log = character.dnd.hp.log || [];
      character.dnd.hp.log.push(Schema.createDefaultHpLogEntry(0, `Temp HP +${tempHp}`));
    }
  }

  function applySpellSlotEffects(character, effects = {}) {
    const slotEffect = effects.spellSlots || null;
    if (!slotEffect) return;
    if (!character.spellSlots) character.spellSlots = {};
    if (slotEffect.all) {
      Object.entries(character.spellSlots).forEach(([level, slot]) => {
        character.spellSlots[level] = { ...slot, current: Number(slot.max || 0) };
      });
      return;
    }
    if (!slotEffect.level) return;
    const level = Number(slotEffect.level || 0);
    const amount = Number(slotEffect.amount || 1);
    const slot = character.spellSlots[level] || { current: 0, max: 0 };
    character.spellSlots[level] = {
      ...slot,
      current: Math.max(0, Math.min(Number(slot.current || 0) + amount, Number(slot.max || 0) || Number(slot.current || 0) + amount)),
    };
  }

  function rerenderSheet(containerEl, character) {
    const root = containerEl.closest(".sheet-preview-body")
      || containerEl.closest("#sheet-content")
      || containerEl;
    root.innerHTML = ViewCharacter.buildHTML(character);
    ViewCharacter.wireInteractive(root, character);
  }

  return { render, wireInteractive };

})();
