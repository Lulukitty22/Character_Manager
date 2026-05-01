/**
 * editor-roblox.js
 * Roblox OC fields — catalog item links with category labels,
 * and the raw outfit command string.
 *
 * Exports: EditorRoblox.buildTab(character) → HTMLElement
 *          EditorRoblox.readTab(character)  → mutates character in-place
 */

const EditorRoblox = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-roblox";

    const roblox = character.roblox || Schema.createDefaultRoblox();

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── Outfit Commands ────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🎮</span>
            <h3>Outfit Commands</h3>
          </div>
          <p class="text-muted text-sm" style="margin-bottom: var(--space-3);">
            Paste the full outfit command string used in-game.
          </p>
          <div class="field-group">
            <textarea id="roblox-outfit-commands" class="field-textarea" rows="3"
              placeholder=":hat me 5857649757 | :shirt me 2894974343 | :pants me 2897218294 | :face me 0"
              style="font-family: var(--font-mono); font-size: var(--text-sm);">${EditorBase.escapeHTML(roblox.outfitCommands || "")}</textarea>
          </div>
        </section>

        <!-- ── Catalog Items ──────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🛍️</span>
            <h3>Catalog Items</h3>
          </div>
          <p class="text-muted text-sm" style="margin-bottom: var(--space-3);">
            List individual Roblox catalog items for this outfit. Links will be clickable on the character sheet.
          </p>

          <div id="roblox-catalog-list" class="array-list">
            ${(roblox.catalogItems || []).map(item => renderCatalogItemRow(item)).join("")}
          </div>
          <div class="array-add-row">
            <button class="button button-primary button-sm" id="btn-add-catalog-item">✦ Add Catalog Item</button>
          </div>
        </section>

      </div>
    `;

    panel.querySelector("#btn-add-catalog-item")?.addEventListener("click", () => {
      addCatalogItemRow(panel);
    });

    wireCatalogList(panel);

    return panel;
  }

  function renderCatalogItemRow(item) {
    const categoryOptions = Schema.ROBLOX_CATEGORIES
      .map(cat => `<option value="${cat}" ${item.category === cat ? "selected" : ""}>${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`)
      .join("");

    return `
      <div class="array-item catalog-item-row" data-catalog-id="${EditorBase.escapeAttr(item.id || Schema.generateId())}">
        <div class="array-item-content">
          <div class="fields-grid-3">
            <div class="field-group" style="margin-bottom:0">
              <label class="field-label">Name</label>
              <input type="text" class="field-input catalog-item-name"
                placeholder="Blue Sci-fi Cat Ears"
                value="${EditorBase.escapeAttr(item.name || "")}" />
            </div>
            <div class="field-group" style="margin-bottom:0">
              <label class="field-label">Category</label>
              <select class="field-select catalog-item-category">
                ${categoryOptions}
              </select>
            </div>
            <div class="field-group" style="margin-bottom:0">
              <label class="field-label">Catalog URL</label>
              <input type="url" class="field-input catalog-item-url"
                placeholder="https://www.roblox.com/catalog/…"
                value="${EditorBase.escapeAttr(item.url || "")}" />
            </div>
          </div>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-danger btn-remove-catalog-item" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireCatalogList(panelEl) {
    panelEl.querySelectorAll(".catalog-item-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-catalog-item")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addCatalogItemRow(panelEl) {
    const item   = Schema.createDefaultRobloxCatalogItem();
    const listEl = panelEl.querySelector("#roblox-catalog-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderCatalogItemRow(item);
    const rowEl  = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-catalog-item")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".catalog-item-name")?.focus();
  }

  function readTab(character) {
    if (!character.roblox) character.roblox = Schema.createDefaultRoblox();

    character.roblox.outfitCommands = document.getElementById("roblox-outfit-commands")?.value || "";

    character.roblox.catalogItems = Array.from(
      document.querySelectorAll("#roblox-catalog-list .catalog-item-row")
    ).map(rowEl => ({
      id:       rowEl.dataset.catalogId || Schema.generateId(),
      name:     rowEl.querySelector(".catalog-item-name")?.value.trim()     || "",
      category: rowEl.querySelector(".catalog-item-category")?.value        || "accessory",
      url:      rowEl.querySelector(".catalog-item-url")?.value.trim()      || "",
    })).filter(item => item.name || item.url);

    return character;
  }

  return { buildTab, readTab };

})();
