/**
 * view-character-inventory.js
 * Inventory and currency section rendering.
 */

const ViewCharacterInventory = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;

  function render(inventory, currency) {
    const items = inventory || [];
    const funds = currency || {};
    if (!items.length && !Object.values(funds).some(v => v > 0)) return "";

    const rows = items.map(item => {
      const tags = (item.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
      const mechanics = [
        item.quantity != null && item.quantity !== 1 ? { label: "Qty", value: item.quantity, kind: "quantity" } : null,
        item.type ? { label: "Type", value: item.type, kind: "neutral" } : null,
        item.weight != null && item.weight !== "" ? { label: "Weight", value: item.weight, kind: "neutral" } : null,
        item.attuned ? {
          label: "Attuned",
          kind: "requirement",
          description: "This item is attuned or requires attunement for its full effects.",
        } : null,
        item.addons?.equipment?.slot ? { label: "Slot", value: item.addons.equipment.slot, kind: "neutral" } : null,
        item.addons?.equipment?.rarity ? { label: "Rarity", value: item.addons.equipment.rarity, kind: "positive" } : null,
        ...(item.addons?.mechanics || []),
      ].filter(Boolean);
      const mechanicChips = renderMechanicChips(mechanics);

      return `
        <div class="sheet-item-row">
          <div class="sheet-item-main">
            <span class="sheet-item-name">${esc(item.name || "(Unnamed)")}</span>
          </div>
          ${mechanicChips}
          ${item.description ? `<div class="sheet-item-desc text-sm text-muted">${esc(item.description)}</div>` : ""}
          ${tags ? `<div class="sheet-item-tags">${tags}</div>` : ""}
        </div>`;
    }).join("");

    const currencyOrder = [["pp", "Platinum"], ["gp", "Gold"], ["ep", "Electrum"], ["sp", "Silver"], ["cp", "Copper"]];
    const currencyPills = currencyOrder
      .filter(([key]) => (funds[key] || 0) > 0)
      .map(([key, label]) => `
        <span class="sheet-currency-pill">
          <span class="sheet-currency-amount">${funds[key]}</span>
          <span class="sheet-currency-label">${label}</span>
        </span>
      `).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎒 Inventory</h2>
        ${currencyPills ? `<div class="sheet-currency-row">${currencyPills}</div>` : ""}
        ${rows ? `<div class="sheet-item-list">${rows}</div>` : ""}
      </section>
    `;
  }

  return { render };

})();
