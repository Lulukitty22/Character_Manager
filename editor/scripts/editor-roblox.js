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
              Paste supported shorthand commands. Supported lines become catalog items; unsupported lines are preserved below.
            </p>
            <div class="field-group">
              <textarea id="roblox-outfit-commands" class="field-textarea" rows="3"
                placeholder=":hat me 5857649757 | :shirt me 2894974343 | :pants me 2897218294 | :face me 0"
                style="font-family: var(--font-mono); font-size: var(--text-sm);">${EditorBase.escapeHTML(roblox.outfitCommands || "")}</textarea>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button class="button button-ghost button-sm" id="btn-parse-roblox-commands">Sync Catalog From Commands</button>
              <button class="button button-ghost button-sm" id="btn-regenerate-roblox-commands">Regenerate Commands From Catalog</button>
            </div>
            <div class="field-group" style="margin-top: var(--space-3);">
              <label class="field-label" for="roblox-unparsed-commands">Preserved unsupported commands</label>
              <textarea id="roblox-unparsed-commands" class="field-textarea" rows="2"
                placeholder="Unsupported or custom commands stay here.">${EditorBase.escapeHTML((roblox.unparsedOutfitCommands || []).join("\n"))}</textarea>
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
      panel.querySelector("#btn-parse-roblox-commands")?.addEventListener("click", () => parseCommandsIntoCatalog(panel));
      panel.querySelector("#btn-regenerate-roblox-commands")?.addEventListener("click", () => updateCommandsFromCatalog(panel));

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
          <div class="fields-grid-2" style="margin-top: var(--space-3);">
            <div class="field-group" style="margin-bottom:0">
              <label class="field-label">Command</label>
              <input type="text" class="field-input catalog-item-command"
                placeholder="hat"
                value="${EditorBase.escapeAttr(item.command || commandForCategory(item.category || "accessory"))}" />
            </div>
            <div class="field-group" style="margin-bottom:0">
              <label class="field-label">Asset ID</label>
              <input type="text" class="field-input catalog-item-asset-id"
                placeholder="138671048868851"
                value="${EditorBase.escapeAttr(item.assetId || extractAssetId(item.url || ""))}" />
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
      rowEl.querySelector(".btn-remove-catalog-item")?.addEventListener("click", () => {
        rowEl.remove();
        updateCommandsFromCatalog(panelEl);
      });
      rowEl.querySelectorAll("input, select").forEach(input => {
        input.addEventListener("change", () => updateCommandsFromCatalog(panelEl));
      });
      rowEl.querySelector(".catalog-item-url")?.addEventListener("change", (event) => {
        const assetId = extractAssetId(event.target.value);
        if (assetId) rowEl.querySelector(".catalog-item-asset-id").value = assetId;
      });
      rowEl.querySelector(".catalog-item-asset-id")?.addEventListener("change", (event) => {
        const assetId = extractAssetId(event.target.value);
        if (assetId) {
          rowEl.querySelector(".catalog-item-url").value = buildCatalogUrl(assetId);
        }
      });
    });
  }

  function addCatalogItemRow(panelEl) {
    const item   = Schema.createDefaultRobloxCatalogItem();
    const listEl = panelEl.querySelector("#roblox-catalog-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderCatalogItemRow(item);
    const rowEl  = temp.firstElementChild;
    listEl.appendChild(rowEl);
    wireCatalogList(panelEl);
    rowEl.querySelector(".catalog-item-name")?.focus();
  }

  function parseCommandsIntoCatalog(panelEl) {
    const parsed = parseOutfitCommands(panelEl.querySelector("#roblox-outfit-commands")?.value || "");
    const existing = readCatalogRows();
    const byAssetId = new Map(existing.map(item => [item.assetId || extractAssetId(item.url), item]));
    parsed.items.forEach(item => {
      const existingItem = byAssetId.get(item.assetId);
      if (existingItem) Object.assign(existingItem, { ...item, id: existingItem.id });
      else existing.push(item);
    });

    panelEl.querySelector("#roblox-unparsed-commands").value = parsed.unparsed.join("\n");
    renderCatalogRows(panelEl, existing);
    updateCommandsFromCatalog(panelEl);
  }

  function updateCommandsFromCatalog(panelEl) {
    const items = readCatalogRows();
    const unparsed = readUnparsedLines();
    const commands = buildOutfitCommands(items, unparsed);
    const textarea = panelEl.querySelector("#roblox-outfit-commands");
    if (textarea) textarea.value = commands;
  }

  function parseOutfitCommands(text) {
    const lines = String(text || "").split(/\n|\|/).map(line => line.trim()).filter(Boolean);
    const items = [];
    const unparsed = [];

    lines.forEach(line => {
      const match = line.match(/^:(\w+)\s+me\s+((?:https?:\/\/\S+)|\d+)/i);
      if (!match) {
        unparsed.push(line);
        return;
      }

      const command = match[1].toLowerCase();
      const assetId = extractAssetId(match[2]);
      if (!assetId || assetId === "0") {
        unparsed.push(line);
        return;
      }

      items.push({
        id: Schema.generateId(),
        name: command,
        command,
        assetId,
        category: categoryForCommand(command),
        url: buildCatalogUrl(assetId),
      });
    });

    return { items, unparsed };
  }

  function buildOutfitCommands(items, unparsedLines = []) {
    const generated = items
      .map(item => {
        const assetId = item.assetId || extractAssetId(item.url);
        if (!assetId) return "";
        return `:${item.command || commandForCategory(item.category)} me ${assetId}`;
      })
      .filter(Boolean);
    return [...generated, ...unparsedLines.filter(Boolean)].join(" | ");
  }

  function renderCatalogRows(panelEl, items) {
    const listEl = panelEl.querySelector("#roblox-catalog-list");
    listEl.innerHTML = items.map(item => renderCatalogItemRow(item)).join("");
    wireCatalogList(panelEl);
  }

  function readUnparsedLines() {
    return (document.getElementById("roblox-unparsed-commands")?.value || "")
      .split(/\n|\|/)
      .map(line => line.trim())
      .filter(Boolean);
  }

  function readCatalogRows() {
    return Array.from(document.querySelectorAll("#roblox-catalog-list .catalog-item-row"))
      .map(rowEl => {
        const assetId = extractAssetId(rowEl.querySelector(".catalog-item-asset-id")?.value || rowEl.querySelector(".catalog-item-url")?.value || "");
        return {
          id:       rowEl.dataset.catalogId || Schema.generateId(),
          name:     rowEl.querySelector(".catalog-item-name")?.value.trim()     || "",
          category: rowEl.querySelector(".catalog-item-category")?.value        || "accessory",
          command:  rowEl.querySelector(".catalog-item-command")?.value.trim()  || "hat",
          assetId,
          url:      rowEl.querySelector(".catalog-item-url")?.value.trim() || (assetId ? buildCatalogUrl(assetId) : ""),
        };
      })
      .filter(item => item.name || item.url || item.assetId);
  }

  function categoryForCommand(command) {
    const map = {
      hat: "accessory",
      hair: "hair",
      face: "face",
      shirt: "shirt",
      pants: "pants",
      back: "back",
      neck: "neck",
      shoulder: "shoulder",
      waist: "waist",
    };
    return map[command] || "accessory";
  }

  function commandForCategory(category) {
    if (["shirt", "pants", "face", "hair", "back", "neck", "shoulder", "waist"].includes(category)) return category;
    return "hat";
  }

  function extractAssetId(value) {
    const match = String(value || "").match(/(\d{3,})/);
    return match ? match[1] : "";
  }

  function buildCatalogUrl(assetId) {
    return `https://www.roblox.com/catalog/${assetId}/`;
  }

  function readTab(character) {
    if (!character.roblox) return; // Section not enabled — skip

    character.roblox.catalogItems = readCatalogRows();
    character.roblox.unparsedOutfitCommands = readUnparsedLines();
    character.roblox.outfitCommands = buildOutfitCommands(
      character.roblox.catalogItems,
      character.roblox.unparsedOutfitCommands
    );

    return character;
  }

  return { buildTab, readTab };

})();

if (typeof globalThis !== "undefined") globalThis.EditorRoblox = EditorRoblox;
