const InventoryWidgets = (() => {

  function esc(text) {
    if (typeof ViewCharacterUtils !== "undefined") return ViewCharacterUtils.esc(text);
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    if (typeof ViewCharacterUtils !== "undefined") return ViewCharacterUtils.escAttr(text);
    return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function buildSubtitle(item = {}) {
    return [
      item.type || "Item",
      item.addons?.equipment?.rarity || "",
      item.attuned ? "Attuned" : "",
    ].filter(Boolean).join(" | ");
  }

  function resolveActionEntries(character = {}, item = {}) {
    if (typeof DndCalculations === "undefined") return [];
    const entries = DndCalculations.getActionableItems(character)
      .filter(entry => isSameItem(item, entry))
      .map(entry => ({
        ...entry,
        actionState: DndCalculations.evaluateItemActionState(character, entry),
      }));
    if (entries.length) return entries;

    return DndCalculations.getActionableItems({ inventory: [item] })
      .filter(entry => isSameItem(item, entry))
      .map(entry => ({
        ...entry,
        actionState: DndCalculations.evaluateItemActionState({ inventory: [item], customResources: character.customResources || [] }, entry),
      }));
  }

  function buildMechanicChips(item = {}, actionEntries = [], options = {}) {
    const includeActionEffects = options.includeActionEffects !== false;
    const chips = [
      item.quantity != null && item.quantity !== 1 ? { label: "Qty", value: item.quantity, kind: "quantity" } : null,
      item.type ? { label: "Type", value: item.type, kind: "neutral" } : null,
      item.weight != null && item.weight !== "" ? { label: "Weight", value: item.weight, kind: "neutral" } : null,
      item.active === false ? { label: "Inactive", kind: "negative", description: "This item is currently not equipped or not applying passive effects." } : { label: "Active", kind: "positive" },
      item.attuned ? { label: "Attuned", kind: "requirement", description: "This item is attuned or requires attunement for its full effects." } : null,
      item.addons?.equipment?.slot ? { label: "Slot", value: item.addons.equipment.slot, kind: "neutral" } : null,
      item.addons?.equipment?.rarity ? { label: "Rarity", value: item.addons.equipment.rarity, kind: "positive" } : null,
      item.addons?.effects?.hp?.flatBonus ? { label: "Max HP", value: Schema.formatModifier(Number(item.addons.effects.hp.flatBonus || 0)), kind: "positive" } : null,
      item.addons?.effects?.hp?.perLevelBonus ? { label: "HP / Lv", value: Schema.formatModifier(Number(item.addons.effects.hp.perLevelBonus || 0)), kind: "positive" } : null,
      item.addons?.effects?.hp?.tempHp ? { label: "Temp HP", value: `+${Number(item.addons.effects.hp.tempHp || 0)}`, kind: "positive" } : null,
    ].filter(Boolean);

    if (!includeActionEffects) return chips;

    const actionChips = actionEntries.flatMap(entry => {
      const effects = entry.action?.effects || {};
      const chipsForAction = [];
      const healAmount = effects.heal ? DndCalculations.healingAmount({
        action: { effects },
        addons: { healing: effects.heal },
        description: item.description,
      }) : 0;
      if (healAmount) chipsForAction.push({ label: "Healing", value: `+${healAmount}`, kind: "positive" });
      if (effects.tempHp) chipsForAction.push({ label: "Temp HP", value: `+${Number(effects.tempHp?.amount || effects.tempHp || 0)}`, kind: "positive" });
      (effects.resources || []).forEach(effect => {
        chipsForAction.push({
          label: effect.resourceName || effect.target || "Resource",
          value: Schema.formatModifier(Number(effect.delta || 0)),
          kind: Number(effect.delta || 0) >= 0 ? "positive" : "negative",
          description: effect.reason || entry.action?.description || "",
        });
      });
      (effects.inventory || []).forEach(effect => {
        chipsForAction.push({
          label: effect.itemName || effect.target || effect.itemRef || "Item",
          value: effect.delta
            ? Schema.formatModifier(Number(effect.delta || 0))
            : (effect.mustExist || effect.requirePresence ? "Required" : ""),
          kind: Number(effect.delta || 0) >= 0 ? "positive" : "negative",
          description: effect.reason || entry.action?.description || "",
        });
      });
      if (effects.spellSlots?.all) chipsForAction.push({ label: "Slots", value: "Restore All", kind: "positive" });
      if (effects.spellSlots?.level) chipsForAction.push({ label: "Slot", value: `Lv ${effects.spellSlots.level} +${effects.spellSlots.amount || 1}`, kind: "positive" });
      return chipsForAction;
    });

    return [...chips, ...actionChips, ...(item.addons?.mechanics || [])];
  }

  function buildActionSummaryLines(actionEntries = []) {
    return actionEntries.map(entry => {
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
    });
  }

  function renderActionMenu(item = {}, actionEntries = [], options = {}) {
    if (!actionEntries.length) return "";
    const mode = options.mode || "editor";
    const buttonLabel = options.buttonLabel || "Use";
    return `
      <div class="inventory-action-menu" data-item-action-menu="${escAttr(item.id || item.libraryRef || item.name || "")}">
        <button type="button" class="button button-ghost button-sm inventory-action-trigger" data-item-action-toggle>${esc(buttonLabel)}</button>
        <div class="inventory-action-popover" hidden>
          ${actionEntries.map((entry, index) => {
            const actionState = entry.actionState || { ok: true, message: "" };
            const description = entry.action?.description || buildActionSummaryLines([entry])[0] || "";
            const quantityCap = actionQuantityCap(entry);
            const supportsQuantity = quantityCap > 1;
            return `
              <div
                class="inventory-action-choice ${actionState.ok ? "" : "is-disabled"}"
                data-item-action-mode="${escAttr(mode)}"
                data-item-action-index="${index}"
              >
                <span class="inventory-action-choice-title">${esc(entry.action?.label || "Use")}</span>
                ${description ? `<span class="inventory-action-choice-copy">${esc(description)}</span>` : ""}
                ${!actionState.ok && actionState.message ? `<span class="inventory-action-choice-note">${esc(actionState.message)}</span>` : ""}
                <div class="inventory-action-choice-footer">
                  ${supportsQuantity ? `
                    <div class="inventory-action-stepper" data-item-action-stepper>
                      <button type="button" class="inventory-action-step-btn" data-item-action-step="-1" ${actionState.ok ? "" : "disabled"}>-</button>
                      <input type="number" min="1" max="${quantityCap}" value="1" class="inventory-action-qty" data-item-action-qty ${actionState.ok ? "" : "disabled"} />
                      <button type="button" class="inventory-action-step-btn" data-item-action-step="1" ${actionState.ok ? "" : "disabled"}>+</button>
                    </div>
                  ` : `<span class="inventory-action-choice-note">${esc(quantityCap === 1 ? "Single-use action" : "")}</span>`}
                  <button
                    type="button"
                    class="button button-ghost button-sm inventory-action-confirm"
                    data-item-action-choice
                    data-item-action-mode="${escAttr(mode)}"
                    data-item-action-index="${index}"
                    ${actionState.ok ? "" : "disabled"}
                  >${esc(mode === "editor" ? "Use" : "Queue")}</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function wireActionMenus(containerEl, options = {}) {
    if (!containerEl || containerEl.dataset.inventoryActionMenuWired === "true") return;
    containerEl.dataset.inventoryActionMenuWired = "true";

    containerEl.addEventListener("click", event => {
      const toggle = event.target.closest("[data-item-action-toggle]");
      if (toggle) {
        event.preventDefault();
        event.stopPropagation();
        const menu = toggle.closest("[data-item-action-menu]");
        const popover = menu?.querySelector(".inventory-action-popover");
        if (!popover) return;
        closeAllMenus(containerEl, popover);
        const nextHidden = !popover.hidden;
        popover.hidden = nextHidden;
        menu.classList.toggle("open", !nextHidden);
        return;
      }

      const choice = event.target.closest("[data-item-action-choice]");
      if (choice) {
        event.preventDefault();
        event.stopPropagation();
        const menu = choice.closest("[data-item-action-menu]");
        const itemRow = choice.closest("[data-item-action-host]") || choice.closest(".item-row") || choice.closest(".array-item") || choice.closest(".ovh-item-record") || choice.closest(".ovh-gameplay-record");
        const actionIndex = parseInt(choice.dataset.itemActionIndex || "-1", 10);
        const quantityInput = choice.closest(".inventory-action-choice")?.querySelector("[data-item-action-qty]");
        const quantity = Math.max(1, parseInt(quantityInput?.value || "1", 10) || 1);
        if (typeof options.onSelect === "function") options.onSelect({ choice, menu, itemRow, actionIndex, quantity });
        closeAllMenus(containerEl);
        return;
      }

      const stepButton = event.target.closest("[data-item-action-step]");
      if (stepButton) {
        event.preventDefault();
        event.stopPropagation();
        const stepper = stepButton.closest("[data-item-action-stepper]");
        const input = stepper?.querySelector("[data-item-action-qty]");
        if (!input) return;
        const delta = parseInt(stepButton.dataset.itemActionStep || "0", 10) || 0;
        const min = Math.max(1, parseInt(input.min || "1", 10) || 1);
        const max = Math.max(min, parseInt(input.max || String(min), 10) || min);
        const next = Math.max(min, Math.min(max, (parseInt(input.value || "1", 10) || 1) + delta));
        input.value = String(next);
        return;
      }

      if (!event.target.closest("[data-item-action-menu]")) {
        closeAllMenus(containerEl);
      }
    });
  }

  function closeAllMenus(containerEl, keepOpen = null) {
    containerEl.querySelectorAll(".inventory-action-popover").forEach(popover => {
      if (keepOpen && popover === keepOpen && popover.hidden) return;
      if (keepOpen && popover === keepOpen && !popover.hidden) return;
      popover.hidden = true;
      popover.closest("[data-item-action-menu]")?.classList.remove("open");
    });
    if (keepOpen) {
      keepOpen.hidden = false;
      keepOpen.closest("[data-item-action-menu]")?.classList.add("open");
    }
  }

  function isSameItem(a = {}, b = {}) {
    const keysA = comparableKeys(a);
    const keysB = comparableKeys(b);
    return keysA.some(key => key && keysB.includes(key));
  }

  function comparableKeys(item = {}) {
    return [item.id, item.libraryRef, item.name]
      .filter(Boolean)
      .map(value => String(value).trim().toLowerCase());
  }

  function actionQuantityCap(entry = {}) {
    const limits = [];
    const actionState = entry.actionState || {};
    if (entry.action?.consumeQuantity) {
      limits.push(Math.max(0, Number(entry.quantity ?? 0)));
    }
    (actionState.resources || []).forEach((resource) => {
      const delta = Number(resource.delta || resource.effectDelta || 0);
      if (delta < 0) limits.push(Math.floor(Number(resource.current || 0) / Math.abs(delta)));
      if (delta > 0 && Number(resource.cap || resource.max || 0) > 0) {
        limits.push(Math.floor((Number(resource.cap || resource.max || 0) - Number(resource.current || 0)) / delta));
      }
    });
    (actionState.inventory || []).forEach((inventory) => {
      const delta = Number(inventory.delta || inventory.effectDelta || 0);
      if (delta < 0) limits.push(Math.floor(Number(inventory.current || 0) / Math.abs(delta)));
      else if (inventory.required > 0) limits.push(Math.floor(Number(inventory.current || 0) / Math.max(1, Number(inventory.required || 1))));
    });
    const filtered = limits.filter((value) => Number.isFinite(value) && value > 0);
    return Math.max(1, filtered.length ? Math.min(...filtered) : 1);
  }

  return {
    buildSubtitle,
    resolveActionEntries,
    buildMechanicChips,
    buildActionSummaryLines,
    renderActionMenu,
    wireActionMenus,
    actionQuantityCap,
  };

})();

if (typeof globalThis !== "undefined") globalThis.InventoryWidgets = InventoryWidgets;
