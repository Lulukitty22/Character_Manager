/**
 * view-character-gameplay.js
 * Shared D&D Gameplay summary/action hub for Character Card and Session View.
 */

const ViewCharacterGameplay = (() => {
  const esc = ViewCharacterUtils.esc;
  const renderOvhChips = ViewCharacterUtils.renderOvhChips;

  function render(character, options = {}) {
    if (!character?.dnd) return "";
    const preset = SurfacePresets.resolve(options.preset);
    const hpState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : { current: 0, max: 0, temp: 0 };
    const slotState = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveSpellSlots(character)
      : { slots: {} };
    const actionableItems = typeof DndCalculations !== "undefined"
      ? DndCalculations.getActionableItems(character).map((item) => ({
        ...item,
        actionState: DndCalculations.evaluateItemActionState(character, item),
      }))
      : [];
    const utilities = buildUtilityEntries(character);
    const record = buildRecord(character, hpState, slotState, actionableItems);

    if (!record.quickActions.length && !record.itemActions.length && !record.spellActions.length && !record.combatResources.length && !record.utility.length) {
      return "";
    }

    return `
      <section class="ovh-section ovh-gameplay-section">
        <div class="ovh-section-header">
          <h2>D&D Gameplay</h2>
          <div class="ovh-section-divider"><svg viewBox="0 0 600 14" preserveAspectRatio="none"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg></div>
        </div>
        ${renderSection("Quick Actions", "Core combat/rest state at a glance.", record.quickActions, preset)}
        ${renderSection("Item Actions", "Use the same action catalog the runtime uses for inventory items.", record.itemActions, preset)}
        ${renderSection("Spell Actions", "Slot state and cast-ready spell references.", record.spellActions, preset)}
        ${renderSection("Combat Resources", "Ammo, charges, temp HP, and tracked combat pools.", record.combatResources, preset)}
        ${renderSection("Utility", "Downtime, prep, rests, and other non-combat session hooks.", [...record.utility, ...utilities], preset)}
      </section>
    `;
  }

  function buildRecord(character, hpState, slotState, actionableItems) {
    const quickActions = [
      {
        title: "Hit Points",
        subtitle: `${hpState.current} / ${hpState.max}${hpState.temp ? ` + ${hpState.temp} temp` : ""}`,
        chips: [
          { label: "Current", value: hpState.current, kind: "quantity" },
          { label: "Max", value: hpState.max, kind: "quantity" },
          hpState.temp ? { label: "Temp", value: hpState.temp, kind: "positive" } : null,
        ].filter(Boolean),
        actionKind: "hp_overview",
      },
      {
        title: "Short Rest",
        subtitle: "Recovery, hit dice, and short-rest features.",
        chips: [{ label: "Utility", value: "Queue", kind: "rest" }],
        actionKind: "short_rest",
        summary: "Take a short rest and recover what the DM allows.",
      },
      {
        title: "Long Rest",
        subtitle: "Reset long-rest resources and preparation.",
        chips: [{ label: "Utility", value: "Queue", kind: "rest" }],
        actionKind: "long_rest",
        summary: "Take a long rest and restore what the DM allows.",
      },
    ];

    const itemActions = actionableItems.map((item) => ({
      title: item.name || "Item",
      subtitle: item.action?.description || item.description || "",
      chips: buildItemActionChips(item),
      actionKind: classifyItemAction(item),
      itemRef: item.libraryRef || item.id || "",
      summary: `${item.action?.label || "Use"} ${item.name || "item"}`,
      label: item.action?.label || "Use",
      disabled: !item.actionState?.ok,
      disabledReason: item.actionState?.message || "",
    }));

    const spellActions = Object.keys(slotState.slots || {}).map((levelKey) => {
      const level = Number(levelKey || 0);
      const slot = slotState.slots[levelKey] || { current: 0, max: 0 };
      return {
        title: `Level ${level} Slots`,
        subtitle: `${slot.current} / ${slot.max} available`,
        chips: [
          { label: "Current", value: slot.current, kind: slot.current > 0 ? "quantity" : "negative" },
          { label: "Max", value: slot.max, kind: "quantity" },
        ],
        actionKind: "spend_spell_slot",
        summary: `Spend one level ${level} spell slot.`,
        payload: { level },
        disabled: Number(slot.max || 0) <= 0 || Number(slot.current || 0) <= 0,
      };
    });

    const combatResources = [
      hpState.temp ? {
        title: "Temporary HP",
        subtitle: `${hpState.temp} temp HP active`,
        chips: [{ label: "Temp", value: hpState.temp, kind: "positive" }],
        actionKind: "temp_hp",
      } : null,
      ...(character.customResources || []).map((resource) => ({
        title: resource.name || "Resource",
        subtitle: `${Number(resource.current || 0)} / ${Number(resource.max || 0)}`,
        chips: [
          { label: "Current", value: Number(resource.current || 0), kind: "quantity" },
          { label: "Max", value: Number(resource.max || 0), kind: "quantity" },
        ],
        actionKind: "resource_overview",
      })),
    ].filter(Boolean);

    const utility = [];
    return { quickActions, itemActions, spellActions, combatResources, utility };
  }

  function renderSection(title, subtitle, rows, preset) {
    if (!rows.length) return "";
    return `
      <div class="ovh-record-group ovh-gameplay-group">
        <p class="ovh-group-label">
          <span>${esc(title)}</span>
          <span class="count">${rows.length}</span>
        </p>
        <div class="ovh-gameplay-subtitle">${esc(subtitle)}</div>
        ${rows.map((row, index) => renderRow(row, preset, title, index)).join("")}
      </div>
    `;
  }

  function renderRow(row, preset, sectionTitle, index) {
    const canQueue = preset.canQueueActions && row.actionKind && row.summary;
    const buttonLabel = row.label || (row.actionKind === "consume_item" ? "Use" : "Queue");
    const queueButton = canQueue
      ? `<button type="button" class="button button-ghost button-sm ovh-gameplay-use" data-gameplay-kind="${ViewCharacterUtils.escAttr(row.actionKind)}" data-gameplay-summary="${ViewCharacterUtils.escAttr(row.summary || "")}" data-gameplay-item-ref="${ViewCharacterUtils.escAttr(row.itemRef || "")}" data-gameplay-payload="${ViewCharacterUtils.encodeDataAttr(row.payload || {})}" ${row.disabled ? "disabled" : ""}>${esc(buttonLabel)}</button>`
      : "";
    const lockText = !preset.canQueueActions && !preset.canUseActions
      ? `<span class="badge">${esc(preset.label)}</span>`
      : row.disabled && row.disabledReason
        ? `<span class="badge badge-crimson" title="${ViewCharacterUtils.escAttr(row.disabledReason)}">Blocked</span>`
        : "";

    return `
      <div class="ovh-record ovh-gameplay-record" data-gameplay-section="${ViewCharacterUtils.escAttr(sectionTitle)}" data-gameplay-index="${index}">
        <div class="ovh-gameplay-row">
          <div class="title-block">
            <div class="title">
              ${esc(row.title)}
              ${row.subtitle ? `<span class="sub">${esc(row.subtitle)}</span>` : ""}
            </div>
            ${renderOvhChips(row.chips || [], { className: "ovh-chips quick-chips" })}
          </div>
          <div class="ovh-gameplay-actions">
            ${lockText}
            ${queueButton}
          </div>
        </div>
      </div>
    `;
  }

  function buildItemActionChips(item) {
    const actionState = item.actionState || {};
    const resourceChips = (actionState.resources || []).map((entry) => ({
      label: entry.name,
      value: `${entry.current}/${entry.max}`,
      kind: entry.shortage ? "negative" : "quantity",
      description: entry.shortage ? `Needs ${entry.required}, only ${entry.current} available.` : "",
    }));
    const inventoryChips = (actionState.inventory || []).map((entry) => ({
      label: entry.name,
      value: `${entry.current}`,
      kind: entry.shortage || entry.missing ? "negative" : "quantity",
      description: entry.shortage ? `Needs ${entry.required}, only ${entry.current} available.` : entry.missing ? "Required inventory item is missing." : "",
    }));
    const base = [
      item.quantity != null ? { label: "Qty", value: item.quantity, kind: "quantity" } : null,
      item.action?.label ? { label: "Action", value: item.action.label, kind: "action" } : null,
      item.action?.effects?.heal ? { label: "Heal", value: `+${DndCalculations.healingAmount(item)}`, kind: "positive" } : null,
    ].filter(Boolean);
    return [...base, ...resourceChips, ...inventoryChips];
  }

  function classifyItemAction(item = {}) {
    const label = String(item.action?.label || "").toLowerCase();
    if (label.includes("ready")) return "ready_ammo";
    if (label.includes("stow")) return "stow_ammo";
    if (label.includes("shoot") || label.includes("attack") || item.type === "weapon") return "attack";
    if (item.action?.effects?.heal || item.action?.effects?.tempHp) return "consume_item";
    return "utility";
  }

  function buildUtilityEntries(character = {}) {
    const entries = [];
    if ((character.inventory || []).some((item) => String(item.name || "").toLowerCase().includes("herb"))) {
      entries.push({
        title: "Potion Brewing",
        subtitle: "Queue a downtime crafting request for the DM to resolve.",
        chips: [{ label: "Craft", value: "Downtime", kind: "rest" }],
        actionKind: "craft",
        summary: "Spend downtime making a potion or other alchemical utility item.",
      });
    }
    return entries;
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".ovh-gameplay-use").forEach((button) => {
      if (button.dataset.viewerWired === "true") return;
      button.dataset.viewerWired = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const bridge = globalThis.__SESSION_VIEW_BRIDGE__;
        if (!bridge || typeof bridge.queueGameplayAction !== "function") {
          const preset = SurfacePresets.active();
          if (preset.canManageAuth && typeof GitHubAuthWidget !== "undefined") {
            GitHubAuthWidget.open();
          } else {
            ViewCharacterUtils.showToast("This surface is read-only.", "info");
          }
          return;
        }

        bridge.queueGameplayAction({
          kind: button.dataset.gameplayKind || "utility",
          summary: button.dataset.gameplaySummary || "",
          itemRef: button.dataset.gameplayItemRef || "",
          payload: ViewCharacterUtils.decodeDataAttr(button.dataset.gameplayPayload, {}),
        });
      });
    });
  }

  return { render, wireInteractive };
})();
