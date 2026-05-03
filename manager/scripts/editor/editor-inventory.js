/**
 * editor-inventory.js
 * Item list and currency editor — available to all character types.
 *
 * Exports: EditorInventory.buildTab(character) → HTMLElement
 *          EditorInventory.readTab(character)  → mutates character in-place
 */

const EditorInventory = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-inventory";

    const items    = (character.inventory || []).map(item => typeof Library !== "undefined" ? Library.resolveRef(item) : item);
    const currency = character.currency  || { gp: 0, sp: 0, cp: 0, ep: 0, pp: 0 };

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── Currency ──────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">💰</span>
            <h3>Currency</h3>
          </div>

          <div class="currency-grid">
            ${renderCurrencyField("pp", "Platinum", currency.pp)}
            ${renderCurrencyField("gp", "Gold",     currency.gp)}
            ${renderCurrencyField("ep", "Electrum", currency.ep)}
            ${renderCurrencyField("sp", "Silver",   currency.sp)}
            ${renderCurrencyField("cp", "Copper",   currency.cp)}
          </div>

          <style>
            .currency-grid {
              display: flex;
              gap:     var(--space-3);
              flex-wrap: wrap;
            }
            .currency-field {
              display:          flex;
              flex-direction:   column;
              align-items:      center;
              gap:              var(--space-1);
              background-color: var(--color-bg-raised);
              border:           1px solid var(--color-border-subtle);
              border-radius:    var(--radius-base);
              padding:          var(--space-3);
              min-width:        80px;
            }
            .currency-label {
              font-family:    var(--font-ui);
              font-size:      var(--text-xs);
              font-weight:    600;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color:          var(--color-text-muted);
            }
            .currency-input {
              width:            60px;
              text-align:       center;
              font-family:      var(--font-display);
              font-size:        var(--text-xl);
              font-weight:      700;
            }
          </style>
        </section>

        <!-- ── Items ─────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🎒</span>
            <h3>Items &amp; Equipment</h3>
          </div>

          <div id="inventory-list" class="array-list">
            ${items.map(item => renderItemRow(item)).join("")}
          </div>

          <div class="array-add-row">
            <button class="button button-primary button-sm" id="btn-add-item">✦ Add Item</button>
            <button class="button button-ghost button-sm" id="btn-browse-items">Browse Library</button>
          </div>
        </section>

      </div>
    `;

    panel.querySelector("#btn-add-item").addEventListener("click", () => addItemRow(panel));
    panel.querySelector("#btn-browse-items")?.addEventListener("click", () => browseLibraryItems(panel));
    wireItemList(panel);

    return panel;
  }

  function renderCurrencyField(key, label, value) {
    return `
      <div class="currency-field">
        <span class="currency-label">${label}</span>
        <input type="number" min="0" id="currency-${key}"
          class="field-input currency-input"
          value="${value || 0}" />
      </div>
    `;
  }

  function renderItemRow(item) {
    const typeLabel = item.type || "misc";
    const attuned   = item.attuned ? `<span class="badge badge-accent">Attuned</span>` : "";
    const active    = item.active !== false ? `<span class="badge">Active</span>` : `<span class="badge">Inactive</span>`;
    const tags      = (item.tags || []).map(tag => `<span class="badge">${EditorBase.escapeHTML(tag)}</span>`).join("");

    return `
      <div class="array-item item-row"
        data-item-id="${EditorBase.escapeAttr(item.id)}"
        data-source="${EditorBase.escapeAttr(item.source || "inline")}"
        data-library-collection="${EditorBase.escapeAttr(item.libraryCollection || "")}"
        data-library-source="${EditorBase.escapeAttr(item.librarySource || "")}"
        data-library-ref="${EditorBase.escapeAttr(item.libraryRef || "")}">
        <div class="array-item-content">
          <div class="flex-between">
            <div class="flex items-center gap-2">
              <span class="array-item-title">${EditorBase.escapeHTML(item.name || "(Unnamed Item)")}</span>
              ${item.source === "library" ? `<span class="badge badge-accent">Library</span>` : ""}
              <span class="badge">${EditorBase.escapeHTML(typeLabel)}</span>
              ${active}
              ${attuned}
              ${tags}
            </div>
            <span class="text-muted text-sm">×${item.quantity ?? 1}</span>
          </div>

          <!-- Expandable detail form -->
          <div class="expandable-section collapsed item-detail-form">
            <div style="margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4);">

              <div class="fields-grid-3">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Name</label>
                  <input type="text" class="field-input item-name"
                    placeholder="Item name"
                    value="${EditorBase.escapeAttr(item.name || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Type</label>
                  <select class="field-select item-type">
                    ${Schema.ITEM_TYPES.map(t =>
                      `<option value="${t}" ${item.type === t ? "selected" : ""}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
                    ).join("")}
                  </select>
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Quantity</label>
                  <input type="number" min="0" class="field-input field-number item-quantity"
                    value="${item.quantity ?? 1}" />
                </div>
              </div>

              <div class="fields-grid-2">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Weight (lb)</label>
                  <input type="number" min="0" step="0.1" class="field-input field-number item-weight"
                    value="${item.weight ?? ""}" placeholder="—" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Tags (comma-separated)</label>
                  <input type="text" class="field-input item-tags"
                    placeholder="legendary, magical…"
                    value="${EditorBase.escapeAttr((item.tags || []).join(", "))}" />
                </div>
              </div>

              <div class="field-group" style="margin-bottom:0">
                <label class="field-label">Description</label>
                <textarea class="field-textarea item-description" rows="3"
                  placeholder="Item description, abilities, lore…">${EditorBase.escapeHTML(item.description || "")}</textarea>
              </div>

              <label class="field-checkbox-row">
                <input type="checkbox" class="item-active" ${item.active !== false ? "checked" : ""} />
                Active / Equipped
              </label>

              <label class="field-checkbox-row">
                <input type="checkbox" class="item-attuned" ${item.attuned ? "checked" : ""} />
                Requires Attunement
              </label>

            </div>
          </div>

          <button class="expand-toggle" data-expanded="false">▸ Show details</button>
        </div>

        <div class="array-item-actions">
          <button class="button button-icon button-danger btn-remove-item" title="Remove item">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireItemList(panelEl) {
    panelEl.querySelectorAll(".item-row").forEach(rowEl => wireItemRow(rowEl));
  }

  function wireItemRow(rowEl) {
    const toggleBtn  = rowEl.querySelector(".expand-toggle");
    const detailForm = rowEl.querySelector(".item-detail-form");
    const removeBtn  = rowEl.querySelector(".btn-remove-item");

    toggleBtn?.addEventListener("click", () => {
      const expanded = toggleBtn.dataset.expanded === "true";
      toggleBtn.dataset.expanded = String(!expanded);
      toggleBtn.textContent      = expanded ? "▸ Show details" : "▾ Hide details";
      detailForm?.classList.toggle("collapsed", expanded);
    });

    removeBtn?.addEventListener("click", () => rowEl.remove());

    rowEl.querySelector(".item-name")?.addEventListener("input", (event) => {
      const titleEl = rowEl.querySelector(".array-item-title");
      if (titleEl) titleEl.textContent = event.target.value || "(Unnamed Item)";
    });
  }

  function addItemRow(panelEl, item = null) {
    item = item || Schema.createDefaultInventoryItem();
    const listEl = panelEl.querySelector("#inventory-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderItemRow(item);
    const rowEl  = temp.firstElementChild;

    wireItemRow(rowEl);

    const toggleBtn  = rowEl.querySelector(".expand-toggle");
    const detailForm = rowEl.querySelector(".item-detail-form");
    if (toggleBtn && detailForm) {
      toggleBtn.dataset.expanded = "true";
      toggleBtn.textContent      = "▾ Hide details";
      detailForm.classList.remove("collapsed");
    }

    listEl.appendChild(rowEl);
    rowEl.querySelector(".item-name")?.focus();
  }

  async function browseLibraryItems(panelEl) {
    try {
      await Library.loadAll();
      const items = Library.list("items");
      if (!items.length) {
        App.showToast("No shared items yet. Add one in Library or save an inline item first.", "info");
        return;
      }
      EditorSpells.openBrowser({
        title: "Browse Library Items",
        subtitle: "Search shared items and preview their effects before adding them to the inventory.",
        entries: items.map(item => ({
          id: item.id,
          name: item.name || "(Unnamed Item)",
          subtitle: [item.type || "misc", item.attuned ? "Attunement" : "", item.weight != null ? `${item.weight} lb` : ""].filter(Boolean).join(" | "),
          sourceLabel: item.source === "external" ? "Imported" : "Library",
          badge: item.type || "",
          preview: renderItemPreview(item),
          onSelect: () => {
            addItemRow(panelEl, Library.resolveRef(Library.createReference("items", item, { quantity: 1, active: true })));
            App.showToast(`Added ${item.name || "item"}.`, "success");
          },
        })),
        actionLabel: "Add Item",
        searchPlaceholder: "Search library items...",
      });
    } catch (error) {
      App.showToast(`Could not load item library: ${error.message}`, "error");
    }
  }

  function renderItemPreview(item) {
    const resolved = typeof Library !== "undefined" ? Library.resolveRef(item) : item;
    const hp = resolved.addons?.effects?.hp || {};
    const healing = resolved.addons?.healing || {};
    const mechanics = typeof ViewCharacterUtils !== "undefined"
      ? ViewCharacterUtils.renderMechanicChips([
        resolved.type ? { label: "Type", value: resolved.type, kind: "neutral" } : null,
        resolved.weight != null ? { label: "Weight", value: `${resolved.weight} lb`, kind: "neutral" } : null,
        resolved.attuned ? { label: "Attune", value: "Required", kind: "requirement" } : null,
        hp.flatBonus ? { label: "Max HP", value: Schema.formatModifier(hp.flatBonus), kind: "positive" } : null,
        hp.perLevelBonus ? { label: "HP / Lv", value: Schema.formatModifier(hp.perLevelBonus), kind: "positive" } : null,
        hp.tempHp ? { label: "Temp HP", value: `+${hp.tempHp}`, kind: "positive" } : null,
        healing.dice ? { label: "Heal", value: healing.dice, kind: "positive" } : null,
        healing.amount ? { label: "Heal", value: `+${healing.amount}`, kind: "positive" } : null,
      ].filter(Boolean))
      : "";

    return `
      <div class="spell-browser-preview-card">
        <div class="array-item-title" style="margin-bottom: var(--space-1);">${EditorBase.escapeHTML(resolved.name || "(Unnamed Item)")}</div>
        <div class="array-item-subtitle" style="margin-bottom: var(--space-3);">${EditorBase.escapeHTML([resolved.type || "misc", resolved.attuned ? "Requires attunement" : ""].filter(Boolean).join(" | "))}</div>
        ${mechanics}
        <div class="card" style="padding: var(--space-4); white-space: pre-wrap; margin-top: var(--space-3);">${EditorBase.escapeHTML(resolved.description || "No description available.")}</div>
      </div>
    `;
  }

  function readTab(character) {
    character.currency = {
      pp: parseInt(document.getElementById("currency-pp")?.value, 10) || 0,
      gp: parseInt(document.getElementById("currency-gp")?.value, 10) || 0,
      ep: parseInt(document.getElementById("currency-ep")?.value, 10) || 0,
      sp: parseInt(document.getElementById("currency-sp")?.value, 10) || 0,
      cp: parseInt(document.getElementById("currency-cp")?.value, 10) || 0,
    };

    const itemRows = document.querySelectorAll("#inventory-list .item-row");
    character.inventory = Array.from(itemRows).map(rowEl => {
      const tagsRaw = rowEl.querySelector(".item-tags")?.value || "";
      const tags    = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
      const weight  = parseFloat(rowEl.querySelector(".item-weight")?.value);

      const item = {
        id:          rowEl.dataset.itemId || Schema.generateId(),
        name:        rowEl.querySelector(".item-name")?.value.trim()        || "",
        type:        rowEl.querySelector(".item-type")?.value               || "misc",
        active:      rowEl.querySelector(".item-active")?.checked           ?? true,
        quantity:    parseInt(rowEl.querySelector(".item-quantity")?.value, 10) || 1,
        weight:      isNaN(weight) ? null : weight,
        attuned:     rowEl.querySelector(".item-attuned")?.checked          || false,
        description: rowEl.querySelector(".item-description")?.value        || "",
        tags,
      };

      if (rowEl.dataset.source === "library") {
        const base = Library.find("items", rowEl.dataset.libraryRef, rowEl.dataset.librarySource) || {};
        return {
          id: rowEl.dataset.itemId || Schema.generateId(),
          source: "library",
          libraryCollection: "items",
          librarySource: rowEl.dataset.librarySource || "custom",
          libraryRef: rowEl.dataset.libraryRef,
          active: item.active,
          quantity: item.quantity,
          overrides: diffAgainstBase(item, base, ["quantity", "active"]),
        };
      }

      return item;
    }).filter(item => item.name || item.libraryRef);

    return character;
  }

  function diffAgainstBase(current, base, localKeys = []) {
    const overrides = {};
    Object.keys(current).forEach(key => {
      if (["id", "source", "libraryCollection", "librarySource", "libraryRef", ...localKeys].includes(key)) return;
      if (JSON.stringify(current[key]) !== JSON.stringify(base[key])) overrides[key] = current[key];
    });
    return overrides;
  }

  return { buildTab, readTab };

})();
