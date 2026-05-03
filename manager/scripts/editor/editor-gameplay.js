/**
 * editor-gameplay.js
 * First-class gameplay state for D&D HP, rests, spell slots, and healing items.
 */

const EditorGameplay = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id = "tab-panel-gameplay";

    if (!character.dnd) {
      panel.innerHTML = `
        <div style="padding: var(--space-12, 3rem) var(--space-6); display: flex; flex-direction: column;
                    align-items: center; gap: var(--space-4); text-align: center; min-height: 320px;
                    justify-content: center;">
          <h3 style="color: var(--text-secondary, #8a8299);">Gameplay</h3>
          <p class="text-muted text-sm" style="max-width: 420px;">
            Enable D&amp;D Stats first to track calculated HP, rests, and spell slots.
          </p>
        </div>
      `;
      return panel;
    }

    if (!character.dnd.hp) character.dnd.hp = { mode: "calculated", max: 0, current: 0, temp: 0, log: [] };
    if (!character.spellSlots) character.spellSlots = {};
    if (!character.spellSlotLog) character.spellSlotLog = [];

    const hpState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : null;
    const slotState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveSpellSlots(character)
      : null;
    const healingItems = typeof DndCalculations !== "undefined"
      ? DndCalculations.getHealingItems(character)
      : [];
    const actionableItems = typeof DndCalculations !== "undefined"
      ? DndCalculations.getActionableItems(character)
      : [];

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">
        ${renderHpSection(character, hpState, healingItems)}
        ${renderSpellSlotSection(slotState, character.spellSlotLog)}
        ${renderItemActionsSection(actionableItems)}
      </div>
    `;

    wireHpSection(panel, character, hpState, healingItems);
    wireSpellSlots(panel, character, slotState);
    wireItemActions(panel, character, actionableItems);

    return panel;
  }

  function renderHpSection(character, hpState, healingItems) {
    const hp = character.dnd?.hp || {};
    const percent = hpState?.max > 0 ? Math.round((hpState.current / hpState.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
    const logRows = (hp.log || []).slice().reverse().map(renderLogEntry).join("");
    const calcChips = hpState?.calculation?.parts?.length && typeof ViewCharacterUtils !== "undefined"
      ? ViewCharacterUtils.renderMechanicChips([
        { label: "Calculated Max", value: hpState.calculatedMax, kind: "positive", description: "Calculated from class hit dice, level, Constitution, and race HP bonuses." },
        ...hpState.calculation.parts,
      ])
      : "";
    const hasCalculatedMax = Boolean(hpState?.hasCalculatedMax);
    const overrideActive = Boolean(hpState?.overrideActive);
    const overrideValue = Math.max(0, Number(hpState?.storedOverrideMax || 0));
    const effectiveMax = Math.max(0, Number(hpState?.max || 0));
    const sourceLabel = overrideActive ? "Manual Override" : hasCalculatedMax ? "Calculated HP" : "Manual HP";
    const healingOptions = healingItems.map(item => {
      const amount = DndCalculations.healingAmount(item);
      const label = `${item.name || "Healing Item"} x${item.quantity ?? 1}${amount ? ` (${amount} avg)` : ""}`;
      return `<option value="${EditorBase.escapeAttr(item.id)}" data-amount="${amount}">${EditorBase.escapeHTML(label)}</option>`;
    }).join("");

    return `
      <section>
        <div class="section-header">
          <span class="section-icon">HP</span>
          <h3>Hit Points</h3>
        </div>

        <div class="hp-display card" style="margin-bottom: var(--space-4);">
          <div class="hp-numbers flex-between" style="margin-bottom: var(--space-3);">
            <div>
              <span style="font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; color: var(--color-text-bright);" id="gp-hp-current-display">${hpState.current}</span>
              <span style="color: var(--color-text-muted); font-size: var(--text-xl);">/ </span>
              <span style="font-family: var(--font-display); font-size: var(--text-xl); color: var(--color-text-muted);" id="gp-hp-max-display">${hpState.max}</span>
              <span style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); margin-left: var(--space-2);">HP</span>
              <span class="badge" id="gp-hp-source-badge" style="margin-left: var(--space-2);">${EditorBase.escapeHTML(sourceLabel)}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted text-sm">Temp:</span>
              <input type="number" id="gp-hp-temp" class="field-input field-number" value="${hp.temp || 0}" min="0" style="width: 64px;" />
            </div>
          </div>

          <div class="hp-bar-track" style="margin-bottom: var(--space-4);">
            <div id="gp-hp-bar-fill" class="hp-bar-fill ${hpClass}" style="width: ${percent}%"></div>
          </div>

          <div class="fields-grid-2" style="margin-bottom: var(--space-4);">
            <div class="field-group" style="margin-bottom: 0;">
              <label class="field-label" for="gp-hp-max-input">${hasCalculatedMax ? "Override Max HP" : "Max HP"}</label>
              <input
                type="number"
                min="0"
                id="gp-hp-max-input"
                class="field-input"
                value="${overrideActive ? overrideValue : effectiveMax}"
                data-override-value="${overrideValue}"
                ${hasCalculatedMax && !overrideActive ? "readonly" : ""}
              />
            </div>
            <div class="field-group" style="margin-bottom: 0;">
              <label class="field-label" for="gp-hp-current-input">Current HP</label>
              <input type="number" min="0" id="gp-hp-current-input" class="field-input" value="${hpState.current}" />
            </div>
          </div>

          ${hasCalculatedMax ? `
            <div style="margin-bottom: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
              <label class="field-checkbox-row">
                <input type="checkbox" id="gp-hp-use-override" ${overrideActive ? "checked" : ""} />
                Use manual max HP override
              </label>
              <p class="text-muted text-sm" id="gp-hp-mode-note">
                ${overrideActive
                  ? "Override is active. Turn it off to go back to automatic class/race HP."
                  : "Calculated HP is primary. Turn on override only when this sheet needs a custom max HP."}
              </p>
              ${calcChips}
              ${overrideActive ? `<button class="button button-ghost button-sm" id="btn-use-calculated-hp">Use Calculated HP</button>` : ""}
            </div>
          ` : calcChips ? `<div style="margin-bottom: var(--space-4);">${calcChips}</div>` : ""}

          <div class="hp-quick-adjust flex gap-2 flex-wrap" style="margin-bottom: var(--space-4);">
            <input type="number" id="gp-hp-adjust-amount" class="field-input field-number" placeholder="Delta" style="width: 86px;" />
            <input type="text" id="gp-hp-adjust-reason" class="field-input flex-1" placeholder="Reason..." />
            <button class="button button-danger button-sm" id="btn-gp-hp-damage">Damage</button>
            <button class="button button-primary button-sm" id="btn-gp-hp-heal">Heal</button>
            <button class="button button-ghost button-sm" id="btn-gp-short-rest">Short Rest</button>
            <button class="button button-ghost button-sm" id="btn-gp-full-rest">Full Rest</button>
          </div>

          ${healingItems.length ? `
            <div class="fields-grid-3" style="margin-bottom: var(--space-4);">
              <select id="gp-healing-item" class="field-select">${healingOptions}</select>
              <input type="number" min="0" id="gp-healing-amount" class="field-input field-number" placeholder="Healing" />
              <button class="button button-primary button-sm" id="btn-use-healing-item">Use Healing Item</button>
            </div>
          ` : ""}
        </div>

        <div class="section-header" style="margin-top: 0;">
          <span class="section-icon">LOG</span>
          <h3>HP Log</h3>
        </div>
        <div id="gp-hp-log-entries" class="log-entries">
          ${logRows || `<p class="text-faint text-sm" style="padding: var(--space-2);">No entries yet.</p>`}
        </div>
      </section>
    `;
  }

  function renderSpellSlotSection(slotState, spellSlotLog) {
    const partChips = slotState?.parts?.length && typeof ViewCharacterUtils !== "undefined"
      ? ViewCharacterUtils.renderMechanicChips(slotState.parts)
      : "";
    const slotRows = [1,2,3,4,5,6,7,8,9].map(level => {
      const slot = slotState?.slots?.[level] || { max: 0, current: 0, calculatedMax: 0, overrideMax: 0 };
      const calculated = slot.calculatedMax || 0;
      return `
        <div class="spell-slot-row" data-slot-level="${level}">
          <span class="spell-slot-level">Lv ${level}</span>
          <div class="spell-slot-inputs">
            <input type="number" min="0" max="20" class="field-input field-number gp-spell-slot-current" data-level="${level}" value="${slot.current || 0}" title="Current slots" />
            <span class="text-muted">/</span>
            <input type="number" min="0" max="20" class="field-input field-number gp-spell-slot-max" data-level="${level}" value="${slotState?.overrideActive ? (slot.overrideMax || slot.max || 0) : (slot.max || 0)}" data-calculated-max="${calculated}" ${slotState?.overrideActive ? "" : "readonly"} title="Max slots" />
          </div>
          ${calculated ? `<span class="text-faint text-xs">Calc ${calculated}</span>` : ""}
          <div class="flex gap-2">
            <button class="button button-ghost button-sm btn-slot-use">Use</button>
            <button class="button button-ghost button-sm btn-slot-restore">Restore</button>
          </div>
        </div>
      `;
    }).join("");
    const logRows = (spellSlotLog || []).slice().reverse().map(renderSpellLogEntry).join("");

    return `
      <section>
        <div class="section-header flex-between">
          <div class="flex items-center gap-2">
            <span class="section-icon">SLOT</span>
            <h3>Spell Slots</h3>
          </div>
          <div class="flex gap-2">
            <button class="button button-ghost button-sm" id="btn-restore-all-slots">Restore All Slots</button>
          </div>
        </div>
        ${slotState ? `
          <div style="margin-bottom: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
            <label class="field-checkbox-row">
              <input type="checkbox" id="gp-slot-use-override" ${slotState.overrideActive ? "checked" : ""} />
              Use manual spell-slot max override
            </label>
            <p class="text-muted text-sm" id="gp-slot-mode-note">
              ${slotState.overrideActive
                ? "Override is active. Turn it off to use class-derived spell slot maxima."
                : "Calculated spell-slot maxima are primary. Turn on override only when a sheet needs custom slot caps."}
            </p>
            ${partChips}
            ${slotState.note ? `<p class="text-muted text-sm">${EditorBase.escapeHTML(slotState.note)}</p>` : ""}
          </div>
        ` : ""}
        <div class="spell-slots-grid">${slotRows}</div>

        <div class="section-header" style="margin-top: var(--space-6);">
          <span class="section-icon">LOG</span>
          <h3>Spell Log</h3>
        </div>
        <div id="gp-spell-log-entries" class="log-entries">
          ${logRows || `<p class="text-faint text-sm" style="padding: var(--space-2);">No entries yet.</p>`}
        </div>
      </section>
    `;
  }

  function renderItemActionsSection(actionableItems) {
    if (!actionableItems.length) return "";

    const rows = actionableItems.map((item, index) => {
      const healAmount = DndCalculations.healingAmount(item);
      const tempHp = Number(item.action?.effects?.tempHp?.amount || item.action?.effects?.tempHp || 0);
      const slotEffect = item.action?.effects?.spellSlots || null;
      const chips = typeof ViewCharacterUtils !== "undefined"
        ? ViewCharacterUtils.renderMechanicChips([
          item.quantity != null ? { label: "Qty", value: item.quantity, kind: "quantity" } : null,
          healAmount ? { label: "Heal", value: `+${healAmount}`, kind: "positive", description: "Average healing amount." } : null,
          tempHp ? { label: "Temp HP", value: `+${tempHp}`, kind: "positive" } : null,
          slotEffect?.all ? { label: "Slots", value: "Restore All", kind: "positive" } : null,
          slotEffect?.level ? { label: "Slot", value: `Lv ${slotEffect.level} +${slotEffect.amount || 1}`, kind: "positive" } : null,
        ].filter(Boolean))
        : "";

      return `
        <div class="array-item" data-item-action-index="${index}">
          <div class="array-item-content">
            <div class="array-item-title">${EditorBase.escapeHTML(item.name || "Item")}</div>
            <div class="array-item-subtitle">${EditorBase.escapeHTML(item.action?.description || item.description || "")}</div>
            ${chips}
          </div>
          <div class="array-item-actions">
            <button class="button button-primary button-sm btn-use-item-action">${EditorBase.escapeHTML(item.action?.label || "Use")}</button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <section>
        <div class="section-header">
          <span class="section-icon">ITEM</span>
          <h3>Item Actions</h3>
        </div>
        <p class="text-muted text-sm" style="margin-bottom: var(--space-4);">
          Use consumables and other actionable items here. Passive HP effects are already included in calculated max HP when the item is active.
        </p>
        <div id="gp-item-actions" class="array-list">${rows}</div>
      </section>
    `;
  }

  function wireHpSection(panelEl, character, hpCalc, healingItems) {
    const maxInput = panelEl.querySelector("#gp-hp-max-input");
    const currentInput = panelEl.querySelector("#gp-hp-current-input");
    const barFill = panelEl.querySelector("#gp-hp-bar-fill");
    const currentDisplay = panelEl.querySelector("#gp-hp-current-display");
    const maxDisplay = panelEl.querySelector("#gp-hp-max-display");
    const overrideToggle = panelEl.querySelector("#gp-hp-use-override");
    const sourceBadge = panelEl.querySelector("#gp-hp-source-badge");
    const modeNote = panelEl.querySelector("#gp-hp-mode-note");
    const labelEl = panelEl.querySelector('label[for="gp-hp-max-input"]');
    const hasCalculatedMax = Boolean(hpCalc?.hasCalculatedMax);

    const updateBar = () => {
      const max = parseInt(maxInput?.value, 10) || 0;
      const current = parseInt(currentInput?.value, 10) || 0;
      const percent = max > 0 ? Math.round((current / max) * 100) : 0;
      if (barFill) {
        barFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        barFill.className = "hp-bar-fill" + (percent >= 60 ? "" : percent >= 30 ? " medium" : " low");
      }
      if (currentDisplay) currentDisplay.textContent = current;
      if (maxDisplay) maxDisplay.textContent = max;
    };

    const syncHpModeUi = (preserveCurrent = false) => {
      if (!maxInput) return;
      const overrideActive = overrideToggle?.checked || !hasCalculatedMax;
      const calculatedMax = Math.max(0, Number(hpCalc?.calculatedMax || hpCalc?.max || 0));
      const previousMax = parseInt(maxInput.value, 10) || 0;
      const storedOverride = parseInt(maxInput.dataset.overrideValue || "0", 10) || 0;

      if (overrideActive) {
        const nextOverride = storedOverride > 0 ? storedOverride : previousMax || calculatedMax;
        maxInput.value = nextOverride;
        maxInput.dataset.overrideValue = String(nextOverride);
        maxInput.readOnly = false;
        if (labelEl) labelEl.textContent = "Override Max HP";
        if (sourceBadge) sourceBadge.textContent = "Manual Override";
        if (modeNote) modeNote.textContent = "Override is active. Turn it off to go back to automatic class/race HP.";
      } else {
        if (previousMax > 0) maxInput.dataset.overrideValue = String(previousMax);
        maxInput.value = calculatedMax;
        maxInput.readOnly = true;
        if (labelEl) labelEl.textContent = "Calculated Max HP";
        if (sourceBadge) sourceBadge.textContent = "Calculated HP";
        if (modeNote) modeNote.textContent = "Calculated HP is primary. Turn on override only when this sheet needs a custom max HP.";
        if (preserveCurrent && currentInput) {
          const current = parseInt(currentInput.value, 10) || 0;
          currentInput.value = Math.min(current, calculatedMax || current);
        }
      }

      updateBar();
    };

    maxInput?.addEventListener("input", updateBar);
    currentInput?.addEventListener("input", updateBar);
    maxInput?.addEventListener("input", () => {
      if (overrideToggle?.checked || !hasCalculatedMax) {
        maxInput.dataset.overrideValue = maxInput.value;
      }
    });
    overrideToggle?.addEventListener("change", () => syncHpModeUi(true));
    panelEl.querySelector("#btn-use-calculated-hp")?.addEventListener("click", () => {
      if (overrideToggle) {
        overrideToggle.checked = false;
        syncHpModeUi(true);
        addHpLog(panelEl, character, 0, `Returned to calculated max HP ${hpCalc.calculatedMax}`);
      }
    });

    panelEl.querySelector("#btn-gp-hp-damage")?.addEventListener("click", () => applyHpAdjust(panelEl, character, "damage"));
    panelEl.querySelector("#btn-gp-hp-heal")?.addEventListener("click", () => applyHpAdjust(panelEl, character, "heal"));
    panelEl.querySelector("#btn-gp-short-rest")?.addEventListener("click", () => applyShortRest(panelEl, character));
    panelEl.querySelector("#btn-gp-full-rest")?.addEventListener("click", () => applyFullRest(panelEl, character));

    const healingSelect = panelEl.querySelector("#gp-healing-item");
    const healingAmount = panelEl.querySelector("#gp-healing-amount");
    healingSelect?.addEventListener("change", () => {
      const option = healingSelect.selectedOptions[0];
      if (healingAmount) healingAmount.value = option?.dataset.amount || "";
    });
    healingSelect?.dispatchEvent(new Event("change"));

    panelEl.querySelector("#btn-use-healing-item")?.addEventListener("click", () => {
      const itemId = healingSelect?.value || "";
      const item = healingItems.find(entry => entry.id === itemId);
      const amount = parseInt(healingAmount?.value, 10) || 0;
      if (!item || amount <= 0) {
        App.showToast("Choose a healing item and amount.", "error");
        return;
      }
      applyHpAdjust(panelEl, character, "heal", amount, item.name || "Healing item");
      decrementInventoryItem(character, itemId);
      App.showToast(`Used ${item.name || "healing item"}.`, "success");
    });

    syncHpModeUi(false);
  }

  function wireSpellSlots(panelEl, character, slotCalc) {
    const overrideToggle = panelEl.querySelector("#gp-slot-use-override");
    const modeNote = panelEl.querySelector("#gp-slot-mode-note");

    const syncSlotModeUi = () => {
      const overrideActive = overrideToggle?.checked || false;
      [1,2,3,4,5,6,7,8,9].forEach(level => {
        const maxEl = panelEl.querySelector(`.gp-spell-slot-max[data-level="${level}"]`);
        const currentEl = panelEl.querySelector(`.gp-spell-slot-current[data-level="${level}"]`);
        if (!maxEl) return;
        const calculatedMax = parseInt(maxEl.dataset.calculatedMax || "0", 10) || 0;
        const current = parseInt(currentEl?.value, 10) || 0;
        if (overrideActive) {
          maxEl.readOnly = false;
          if (!maxEl.value) maxEl.value = calculatedMax;
        } else {
          maxEl.readOnly = true;
          maxEl.value = calculatedMax;
          if (currentEl) currentEl.value = Math.min(current, calculatedMax || current);
        }
      });
      if (modeNote) {
        modeNote.textContent = overrideActive
          ? "Override is active. Turn it off to use class-derived spell slot maxima."
          : "Calculated spell-slot maxima are primary. Turn on override only when a sheet needs custom slot caps.";
      }
    };

    panelEl.querySelectorAll(".spell-slot-row").forEach(row => {
      const level = parseInt(row.dataset.slotLevel, 10);
      row.querySelector(".btn-slot-use")?.addEventListener("click", () => adjustSpellSlot(panelEl, character, level, -1));
      row.querySelector(".btn-slot-restore")?.addEventListener("click", () => adjustSpellSlot(panelEl, character, level, 1));
    });

    overrideToggle?.addEventListener("change", syncSlotModeUi);
    panelEl.querySelector("#btn-restore-all-slots")?.addEventListener("click", () => restoreAllSlots(panelEl, character));
    syncSlotModeUi();
  }

  function wireItemActions(panelEl, character, actionableItems) {
    panelEl.querySelectorAll(".btn-use-item-action").forEach(button => {
      button.addEventListener("click", () => {
        const row = button.closest("[data-item-action-index]");
        const actionEntry = actionableItems[parseInt(row?.dataset.itemActionIndex || "-1", 10)];
        if (!actionEntry) return;
        applyItemAction(panelEl, character, actionEntry);
      });
    });
  }

  function applyHpAdjust(panelEl, character, mode, forcedAmount = null, forcedReason = "") {
    const amount = forcedAmount ?? parseInt(panelEl.querySelector("#gp-hp-adjust-amount")?.value, 10);
    const reason = forcedReason || panelEl.querySelector("#gp-hp-adjust-reason")?.value.trim() || "";
    const currentInput = panelEl.querySelector("#gp-hp-current-input");
    const max = parseInt(panelEl.querySelector("#gp-hp-max-input")?.value, 10) || 0;
    const current = parseInt(currentInput?.value, 10) || 0;

    if (!amount || amount <= 0) {
      App.showToast("Enter an amount greater than 0.", "error");
      return;
    }

    const delta = mode === "damage" ? -amount : amount;
    const newHP = Math.max(0, Math.min(max, current + delta));
    if (currentInput) currentInput.value = newHP;
    currentInput?.dispatchEvent(new Event("input"));
    addHpLog(panelEl, character, delta, reason || (mode === "damage" ? "Damage" : "Healing"));
    const amountEl = panelEl.querySelector("#gp-hp-adjust-amount");
    const reasonEl = panelEl.querySelector("#gp-hp-adjust-reason");
    if (amountEl) amountEl.value = "";
    if (reasonEl) reasonEl.value = "";
  }

  function applyShortRest(panelEl, character) {
    const amount = parseInt(panelEl.querySelector("#gp-hp-adjust-amount")?.value, 10) || 0;
    if (amount > 0) applyHpAdjust(panelEl, character, "heal", amount, "Short rest");
    else addHpLog(panelEl, character, 0, "Short rest");
  }

  function applyFullRest(panelEl, character) {
    const max = parseInt(panelEl.querySelector("#gp-hp-max-input")?.value, 10) || 0;
    const currentInput = panelEl.querySelector("#gp-hp-current-input");
    const tempInput = panelEl.querySelector("#gp-hp-temp");
    if (currentInput) currentInput.value = max;
    if (tempInput) tempInput.value = 0;
    currentInput?.dispatchEvent(new Event("input"));
    restoreAllSlots(panelEl, character, "Full rest");
    addHpLog(panelEl, character, 0, "Full rest");
  }

  function adjustSpellSlot(panelEl, character, level, delta) {
    const currentEl = panelEl.querySelector(`.gp-spell-slot-current[data-level="${level}"]`);
    const max = parseInt(panelEl.querySelector(`.gp-spell-slot-max[data-level="${level}"]`)?.value, 10) || 0;
    const current = parseInt(currentEl?.value, 10) || 0;
    const next = Math.max(0, Math.min(max || 20, current + delta));
    if (currentEl) currentEl.value = next;
    addSpellLog(panelEl, character, level, delta < 0 ? `Used level ${level} slot` : `Restored level ${level} slot`);
  }

  function restoreAllSlots(panelEl, character, reason = "Restored all spell slots") {
    [1,2,3,4,5,6,7,8,9].forEach(level => {
      const max = parseInt(panelEl.querySelector(`.gp-spell-slot-max[data-level="${level}"]`)?.value, 10) || 0;
      const currentEl = panelEl.querySelector(`.gp-spell-slot-current[data-level="${level}"]`);
      if (currentEl) currentEl.value = max;
    });
    addSpellLog(panelEl, character, 0, reason);
  }

  function applyItemAction(panelEl, character, item) {
    const effects = item.action?.effects || {};
    const healAmount = effects.heal ? DndCalculations.healingAmount({ action: { effects }, addons: { healing: effects.heal }, description: item.description }) : 0;
    const tempHp = Number(effects.tempHp?.amount || effects.tempHp || 0);
    const slotEffect = effects.spellSlots || null;

    if (healAmount > 0) {
      applyHpAdjust(panelEl, character, "heal", healAmount, item.name || "Item");
    }
    if (tempHp > 0) {
      const tempEl = panelEl.querySelector("#gp-hp-temp");
      const currentTemp = parseInt(tempEl?.value, 10) || 0;
      if (tempEl) tempEl.value = Math.max(currentTemp, tempHp);
      addHpLog(panelEl, character, 0, `${item.name || "Item"} granted ${tempHp} temp HP`);
    }
    if (slotEffect?.all) {
      restoreAllSlots(panelEl, character, item.name || "Item restored all spell slots");
    } else if (slotEffect?.level) {
      adjustSpellSlot(panelEl, character, Number(slotEffect.level || 0), Math.max(1, Number(slotEffect.amount || 1)));
    }

    if (item.action?.consumeQuantity) {
      decrementInventoryItem(character, item.id);
    }

    App.showToast(`${item.action?.label || "Used"} ${item.name || "item"}.`, "success");
  }

  function addHpLog(panelEl, character, delta, reason) {
    if (!character.dnd.hp.log) character.dnd.hp.log = [];
    const entry = Schema.createDefaultHpLogEntry(delta, reason);
    character.dnd.hp.log.push(entry);
    prependLog(panelEl.querySelector("#gp-hp-log-entries"), renderLogEntry(entry));
  }

  function addSpellLog(panelEl, character, level, reason) {
    if (!character.spellSlotLog) character.spellSlotLog = [];
    const entry = { id: Schema.generateId(), date: new Date().toISOString().slice(0, 10), level, reason };
    character.spellSlotLog.push(entry);
    prependLog(panelEl.querySelector("#gp-spell-log-entries"), renderSpellLogEntry(entry));
  }

  function prependLog(logEl, html) {
    if (!logEl) return;
    const empty = logEl.querySelector("p");
    if (empty) empty.remove();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    logEl.insertBefore(temp.firstElementChild, logEl.firstChild);
  }

  function decrementInventoryItem(character, itemId) {
    const item = (character.inventory || []).find(entry => entry.id === itemId);
    if (item) item.quantity = Math.max(0, Number(item.quantity ?? 1) - 1);
    const row = Array.from(document.querySelectorAll("#inventory-list .item-row"))
      .find(entry => entry.dataset.itemId === itemId);
    const quantityEl = row?.querySelector(".item-quantity");
    if (quantityEl) quantityEl.value = Math.max(0, Number(quantityEl.value || 1) - 1);
  }

  function readTab(character) {
    if (!character.dnd) return character;
    if (!character.dnd.hp) character.dnd.hp = { mode: "calculated", max: 0, current: 0, temp: 0, log: [] };

    const maxEl = document.getElementById("gp-hp-max-input");
    const currentEl = document.getElementById("gp-hp-current-input");
    const tempEl = document.getElementById("gp-hp-temp");
    const overrideEl = document.getElementById("gp-hp-use-override");
    const hpState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : null;
    const overrideActive = overrideEl ? overrideEl.checked : !hpState?.hasCalculatedMax;
    const effectiveMax = overrideActive
      ? (parseInt(maxEl?.value, 10) || 0)
      : Math.max(0, Number(hpState?.calculatedMax || parseInt(maxEl?.value, 10) || 0));
    const storedOverride = parseInt(maxEl?.dataset.overrideValue || maxEl?.value || "0", 10) || 0;

    character.dnd.hp.mode = overrideActive ? "override" : "calculated";
    character.dnd.hp.max = storedOverride || effectiveMax;
    if (currentEl) character.dnd.hp.current = Math.max(0, Math.min(parseInt(currentEl.value, 10) || 0, effectiveMax || parseInt(currentEl.value, 10) || 0));
    if (tempEl) character.dnd.hp.temp = parseInt(tempEl.value, 10) || 0;
    if (typeof DndCalculations !== "undefined") DndCalculations.syncBossDefaultHp(character);

    character.spellSlotMode = document.getElementById("gp-slot-use-override")?.checked ? "override" : "calculated";
    character.spellSlotOverrides = {};
    character.spellSlots = {};
    document.querySelectorAll(".gp-spell-slot-max").forEach(input => {
      const level = parseInt(input.dataset.level, 10);
      const calculatedMax = parseInt(input.dataset.calculatedMax || "0", 10) || 0;
      const max = character.spellSlotMode === "override" ? (parseInt(input.value, 10) || 0) : calculatedMax;
      const current = parseInt(document.querySelector(`.gp-spell-slot-current[data-level="${level}"]`)?.value, 10) || 0;
      if (character.spellSlotMode === "override" && max > 0) character.spellSlotOverrides[level] = max;
      if (max > 0 || current > 0 || calculatedMax > 0) {
        character.spellSlots[level] = {
          max: character.spellSlotMode === "override" ? max : calculatedMax,
          current: Math.max(0, Math.min(current, max || calculatedMax || current)),
        };
      }
    });

    return character;
  }

  function renderLogEntry(entry) {
    const delta = entry.delta || 0;
    const deltaClass = delta >= 0 ? "positive" : "negative";
    const deltaText = delta >= 0 ? `+${delta}` : String(delta);
    return `
      <div class="log-entry">
        <span class="log-entry-delta ${deltaClass}">${EditorBase.escapeHTML(deltaText)}</span>
        <span class="log-entry-reason">${EditorBase.escapeHTML(entry.reason || "-")}</span>
        <span class="log-entry-date">${EditorBase.escapeHTML(entry.date || "")}</span>
      </div>
    `;
  }

  function renderSpellLogEntry(entry) {
    const level = Number(entry.level || 0) > 0 ? `Lv ${entry.level}` : "All";
    return `
      <div class="log-entry">
        <span class="log-entry-delta positive">${EditorBase.escapeHTML(level)}</span>
        <span class="log-entry-reason">${EditorBase.escapeHTML(entry.reason || "-")}</span>
        <span class="log-entry-date">${EditorBase.escapeHTML(entry.date || "")}</span>
      </div>
    `;
  }

  return { buildTab, readTab };

})();
