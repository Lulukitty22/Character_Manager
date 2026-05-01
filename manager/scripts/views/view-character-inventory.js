/**
 * view-character-inventory.js
 * Inventory and currency section rendering.
 */

const ViewCharacterInventory = (() => {

  const esc = ViewCharacterUtils.esc;

  function render(inventory, currency) {
    const items = inventory || [];
    const funds = currency || {};
    if (!items.length && !Object.values(funds).some(v => v > 0)) return "";

    const rows = items.map(item => {
      const qty = item.quantity != null && item.quantity !== 1 ? `<span class="sheet-item-qty">×${item.quantity}</span>` : "";
      const typeBadge = item.type ? `<span class="sheet-item-type-badge">${esc(item.type)}</span>` : "";
      const attunedBadge = item.attuned ? `<span class="sheet-attuned-badge">Attuned</span>` : "";
      const tags = (item.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
      return `
        <div class="sheet-item-row">
          <div class="sheet-item-main">
            <span class="sheet-item-name">${esc(item.name || "(Unnamed)")}</span>
            ${qty}
            ${typeBadge}
            ${attunedBadge}
          </div>
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
