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
      label: effect.resourceName || effect.target || "Resource",
      value: Schema.formatModifier(Number(effect.delta || 0)),
      kind: Number(effect.delta || 0) >= 0 ? "positive" : "negative",
      description: effect.reason || actionEntry.action?.description || "",
    })));
    const inventoryChips = actions.flatMap(actionEntry => (actionEntry.action?.effects?.inventory || []).map(effect => ({
      label: effect.itemName || effect.target || effect.itemRef || "Item",
      value: effect.delta
        ? Schema.formatModifier(Number(effect.delta || 0))
        : (effect.mustExist || effect.requirePresence ? "Required" : ""),
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
      ...inventoryChips,
      ...(item.addons?.mechanics || []),
    ].filter(Boolean);

    const subtitle = [item.type || "Item", item.addons?.equipment?.rarity || "", item.attuned ? "Attuned" : ""]
      .filter(Boolean)
      .join(" | ");
    const quantity = Number(item.quantity ?? 1);
    const openAttr = actions.length || index < 2 ? " open" : "";
    const stateClass = item.active === false ? "" : "prepared";
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
            effects.push(`${effect.resourceName || effect.target || "Resource"} ${Schema.formatModifier(Number(effect.delta || 0))}`);
          });
          (entry.action?.effects?.inventory || []).forEach(effect => {
            const label = effect.itemName || effect.target || effect.itemRef || "Item";
            if (Number(effect.delta || 0)) effects.push(`${label} ${Schema.formatModifier(Number(effect.delta || 0))}`);
            else if (effect.mustExist || effect.requirePresence) effects.push(`Requires ${label}`);
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

  }

  return { render, wireInteractive };

})();
