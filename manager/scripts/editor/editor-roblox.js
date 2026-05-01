/**
 * editor-roblox.js
 * Roblox OC fields — catalog item links with category labels,
 * and the raw outfit command string.
 *
 * When character.roblox is absent, the tab shows an Enable call-to-action instead.
 *
 * Exports: EditorRoblox.buildTab(character) → HTMLElement
 *          EditorRoblox.readTab(character)  → mutates character in-place (skips if section absent)
 */

const EditorRoblox = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-roblox";

    function render() {
      panel.innerHTML = "";

      // ── Section not enabled ──────────────────────────────────────────────────
      if (!character.roblox) {
        panel.innerHTML = `
          <div style="padding: var(--space-12, 3rem) var(--space-6); display: flex; flex-direction: column;
                      align-items: center; gap: var(--space-4); text-align: center; min-height: 320px;
                      justify-content: center;">
            <div style="font-size: 3rem; line-height: 1;">🎮</div>
            <h3 style="color: var(--text-secondary, #8a8299);">Roblox</h3>
            <p class="text-muted text-sm" style="max-width: 400px;">
              This character doesn't have Roblox data yet. Enable this section to add catalog item
              links and outfit command strings.
            </p>
            <button class="button button-primary btn-enable-roblox" style="margin-top: var(--space-2);">
              ✦ Enable Roblox
            </button>
          </div>
        `;
        panel.querySelector(".btn-enable-roblox").addEventListener("click", () => {
          character.roblox = Schema.createDefaultRoblox();
          render();
        });
        return;
      }

      // ── Full editor ──────────────────────────────────────────────────────────
      const roblox = character.roblox;

      panel.innerHTML = `
        <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

          <!-- Remove section -->
          <div style="display: flex; justify-content: flex-end;">
            <button class="button button-ghost button-sm btn-remove-roblox-section"
              style="color: var(--color-danger, #b94040);">
              🗑 Remove Roblox Section
            </button>
          </div>

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

      // Wire remove section
      panel.querySelector(".btn-remove-roblox-section").addEventListener("click", () => {
        if (confirm("Remove Roblox section? All Roblox data for this character will be deleted.")) {
          delete character.roblox;
          render();
        }
      });

      panel.querySelector("#btn-add-catalog-item")?.addEventListener("click", () => {
        addCatalogItemRow(panel);
      });

      wireCatalogList(panel);
    } // end render()

    render();
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
    if (!character.roblox) return; // Section not enabled — skip

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
