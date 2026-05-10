/**
 * view-character-inventory.js
 * Inventory and currency section rendering.
 */

const ViewCharacterInventory = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderOvhChips = ViewCharacterUtils.renderOvhChips;

  function render(character, inventory, currency, preset = null) {
    const items = inventory || [];
    const funds = currency || {};
    if (!items.length && !Object.values(funds).some(v => v > 0)) return "";
    const surfacePreset = typeof SurfacePresets !== "undefined"
      ? SurfacePresets.resolve(preset || SurfacePresets.active())
      : { id: "character_card", canQueueActions: false };

    const actionableById = typeof DndCalculations !== "undefined"
      ? DndCalculations.getActionableItems(character).reduce((map, item) => {
        if (!map[item.id]) map[item.id] = [];
        map[item.id].push(item);
        return map;
      }, {})
      : {};

    const rows = items.map((item, index) => renderItemRow(item, actionableById[item.id] || [], index, surfacePreset)).join("");
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

  function renderItemRow(item, actions, index, preset) {
    const mechanics = typeof InventoryWidgets !== "undefined"
      ? InventoryWidgets.buildMechanicChips(item, actions)
      : [];

    const subtitle = typeof InventoryWidgets !== "undefined"
      ? InventoryWidgets.buildSubtitle(item)
      : [item.type || "Item", item.addons?.equipment?.rarity || "", item.attuned ? "Attuned" : ""]
        .filter(Boolean)
        .join(" | ");
    const quantity = Number(item.quantity ?? 1);
    const openAttr = actions.length || index < 2 ? " open" : "";
    const stateClass = item.active === false ? "" : "prepared";
    const tags = renderOvhChips((item.tags || []).map(tag => ({ label: tag, kind: "neutral" })), { className: "ovh-chips tag-row" });
    const actionMenu = preset?.canQueueActions && typeof InventoryWidgets !== "undefined"
      ? InventoryWidgets.renderActionMenu(item, actions, { mode: "session_view", buttonLabel: "Queue" })
      : "";

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
          ${actionMenu}
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
        content: (typeof InventoryWidgets !== "undefined"
          ? InventoryWidgets.buildActionSummaryLines(actions)
          : actions.map(entry => entry.action?.label || "Use")
        ).join("\n"),
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
    InventoryWidgets?.wireActionMenus?.(containerEl, {
      onSelect: ({ itemRow, actionIndex, choice, quantity }) => {
        const mode = choice?.dataset.itemActionMode || "";
        if (mode !== "session_view") return;
        const itemRecord = ViewCharacterUtils.decodeDataAttr(itemRow?.dataset.sheetRecord, {});
        const resolved = typeof Library !== "undefined" ? Library.resolveRef(itemRecord.raw || {}) : (itemRecord.raw || {});
        const actionEntries = typeof InventoryWidgets !== "undefined"
          ? InventoryWidgets.resolveActionEntries(character, resolved)
          : [];
        const actionEntry = actionEntries[actionIndex];
        if (!actionEntry) return;

        const bridge = globalThis.__SESSION_VIEW_BRIDGE__;
        if (!bridge || typeof bridge.queueGameplayAction !== "function") {
          if (typeof GitHubAuthWidget !== "undefined" && SurfacePresets.active()?.canManageAuth) GitHubAuthWidget.open();
          else ViewCharacterUtils.showToast("This surface is read-only.", "info");
          return;
        }

        bridge.queueGameplayAction({
          kind: actionEntry.action?.effects?.heal || actionEntry.action?.effects?.tempHp
            ? "consume_item"
            : actionEntry.action?.label?.toLowerCase().includes("ready")
              ? "ready_ammo"
              : actionEntry.action?.label?.toLowerCase().includes("stow")
                ? "stow_ammo"
                : actionEntry.type === "weapon"
                  ? "attack"
                  : "utility",
          summary: `${actionEntry.action?.label || "Use"} ${actionEntry.name || "item"}${quantity > 1 ? ` x${quantity}` : ""}`,
          itemRef: actionEntry.libraryRef || actionEntry.id || "",
          quantity,
          payload: {
            actionLabel: actionEntry.action?.label || "Use",
            quantity,
          },
        });
      },
    });

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
