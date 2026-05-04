/**
 * view-character-roblox.js
 * Roblox outfit / catalog item rendering.
 */

const ViewCharacterRoblox = (() => {

  const esc = ViewCharacterUtils.esc;
  const escAttr = ViewCharacterUtils.escAttr;

  function render(roblox) {
    const catalogItems = roblox?.catalogItems || [];
    const outfitCommands = roblox?.outfitCommands || "";
    if (!catalogItems.length && !outfitCommands) return "";

    const grouped = {};
    catalogItems.forEach(item => {
      const category = item.category || "other";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    const categoryOrder = ["hair", "hat", "face", "shirt", "pants", "shoes", "accessory", "gear", "other"];
    const sorted = [
      ...categoryOrder.filter(category => grouped[category]),
      ...Object.keys(grouped).filter(category => !categoryOrder.includes(category)),
    ];

    const catalogHTML = sorted.map(category => {
      const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
      const links = grouped[category].map(item =>
        item.url
          ? `<a href="${escAttr(item.url)}" class="sheet-roblox-item-link" target="_blank" rel="noopener noreferrer">${esc(item.name || "(Unnamed)")}</a>`
          : `<span class="sheet-roblox-item-name">${esc(item.name || "(Unnamed)")}</span>`
      ).join("");
      return `
        <div class="sheet-roblox-category">
          <span class="sheet-roblox-category-label">${esc(catLabel)}</span>
          <div class="sheet-roblox-item-list">${links}</div>
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎮 Roblox Outfit</h2>
        ${catalogItems.length ? `<div class="sheet-roblox-catalog">${catalogHTML}</div>` : ""}
        ${outfitCommands ? `
        <div class="sheet-outfit-commands">
          <div class="sheet-outfit-commands-label text-muted text-sm">Outfit Commands</div>
          <pre class="sheet-outfit-commands-pre">${esc(outfitCommands)}</pre>
        </div>` : ""}
      </section>
    `;
  }

  return { render };

})();
