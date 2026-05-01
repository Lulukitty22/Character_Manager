/**
 * view-library.js
 * Repo-backed shared library management view.
 */

const ViewLibrary = (() => {

  const EDITABLE_COLLECTIONS = ["spells", "items", "resources", "tags", "feats", "traits", "classes"];

  async function render(container) {
    container.innerHTML = `
      <div class="library-view">
        <div class="list-header flex-between">
          <div>
            <h2 class="list-title">Shared Library</h2>
            <p class="text-muted text-sm">Reusable records for characters. Feature-specific details live in addons.</p>
          </div>
          <button id="btn-library-refresh" class="button button-ghost button-sm">Refresh</button>
        </div>
        <div id="library-status" class="text-muted text-sm">Loading library...</div>
      </div>
    `;

    await loadAndRender(container);
    container.querySelector("#btn-library-refresh")?.addEventListener("click", () => loadAndRender(container));
  }

  async function loadAndRender(container) {
    const status = container.querySelector("#library-status");
    if (status) status.textContent = "Loading library...";

    try {
      await Library.loadAll();
      container.innerHTML = buildShell();
      wire(container);
      renderCollection(container, "spells");
    } catch (error) {
      container.innerHTML = `<div class="card"><p class="text-danger">Could not load library: ${escapeHTML(error.message)}</p></div>`;
    }
  }

  function buildShell() {
    return `
      <div class="library-view">
        <div class="list-header flex-between">
          <div>
            <h2 class="list-title">Shared Library</h2>
            <p class="text-muted text-sm">Reusable records for spells, items, resources, tags, feats, traits, and classes.</p>
          </div>
          <button id="btn-library-refresh" class="button button-ghost button-sm">Refresh</button>
        </div>

        <div class="editor-tabs" id="library-tabs">
          ${EDITABLE_COLLECTIONS.map((collection, index) => `
            <button class="editor-tab ${index === 0 ? "active" : ""}" data-library-collection="${collection}">
              ${label(collection)}
            </button>
          `).join("")}
          <button class="editor-tab" data-library-collection="imports">Imports</button>
        </div>

        <div id="library-panel" style="padding: var(--space-6) 0;"></div>
      </div>
    `;
  }

  function wire(container) {
    container.querySelector("#btn-library-refresh")?.addEventListener("click", () => loadAndRender(container));
    container.querySelectorAll("[data-library-collection]").forEach(button => {
      button.addEventListener("click", () => {
        container.querySelectorAll("[data-library-collection]").forEach(tab => tab.classList.remove("active"));
        button.classList.add("active");
        renderCollection(container, button.dataset.libraryCollection);
      });
    });
  }

  function renderCollection(container, collection) {
    const panel = container.querySelector("#library-panel");
    if (!panel) return;

    if (collection === "imports") {
      renderImports(panel);
      return;
    }

    const entries = Library.list(collection);
    panel.innerHTML = `
      <section>
        <div class="section-header flex-between">
          <div class="flex items-center gap-2">
            <span class="section-icon">LIB</span>
            <h3>${label(collection)}</h3>
          </div>
          <button class="button button-primary button-sm" id="btn-add-library-record">Add ${singular(collection)}</button>
        </div>
        <p class="text-muted text-sm" style="margin-bottom: var(--space-4);">
          ${entries.length} shared ${entries.length === 1 ? singular(collection).toLowerCase() : label(collection).toLowerCase()}.
        </p>
        <div id="library-record-list" class="array-list">
          ${entries.map(entry => renderRecordRow(collection, entry)).join("") || `<p class="text-muted text-sm">No records yet.</p>`}
        </div>
      </section>
    `;

    panel.querySelector("#btn-add-library-record")?.addEventListener("click", async () => {
      const record = Schema.createLibraryRecord(collection);
      record.name = `New ${singular(collection)}`;
      await Library.upsert(collection, record);
      renderCollection(container, collection);
      App.showToast(`${singular(collection)} added.`, "success");
    });

    panel.querySelectorAll(".btn-save-library-record").forEach(button => {
      button.addEventListener("click", async () => {
        const row = button.closest(".library-record-row");
        const record = readRecordRow(collection, row);
        await Library.upsert(collection, record, record.source || "custom");
        App.showToast("Library record saved.", "success");
        renderCollection(container, collection);
      });
    });

    panel.querySelectorAll(".btn-delete-library-record").forEach(button => {
      button.addEventListener("click", async () => {
        const row = button.closest(".library-record-row");
        const name = row.querySelector(".library-record-name")?.value || "record";
        if (!confirm(`Delete "${name}" from the shared library?`)) return;
        await Library.remove(collection, row.dataset.recordId, row.dataset.recordSource || "custom");
        App.showToast("Library record deleted.", "success");
        renderCollection(container, collection);
      });
    });
  }

  function renderRecordRow(collection, entry) {
    const addons = JSON.stringify(entry.addons || {}, null, 2);
    return `
      <div class="array-item library-record-row" data-record-id="${escapeAttr(entry.id)}" data-record-source="${escapeAttr(entry.source || "custom")}">
        <div class="array-item-content">
          <div class="fields-grid-3">
            <input class="field-input library-record-name" value="${escapeAttr(entry.name || "")}" placeholder="Name" />
            <input class="field-input library-record-tags" value="${escapeAttr((entry.tags || []).join(", "))}" placeholder="tags, comma, separated" />
            <input class="field-input library-record-variant" value="${escapeAttr(entry.variantOf || "")}" placeholder="Variant of record id" />
          </div>
          ${renderFeatureFields(collection, entry)}
          <div class="field-group" style="margin-top: var(--space-3); margin-bottom: 0;">
            <label class="field-label">Addons JSON</label>
            <textarea class="field-textarea library-record-addons" rows="4">${escapeHTML(addons)}</textarea>
          </div>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-primary btn-save-library-record" title="Save">Save</button>
          <button class="button button-icon button-danger btn-delete-library-record" title="Delete">Delete</button>
        </div>
      </div>
    `;
  }

  function renderFeatureFields(collection, entry) {
    if (collection === "spells") {
      return `
        <div class="fields-grid-4" style="margin-top: var(--space-3);">
          <input class="field-input library-spell-level" type="number" min="0" max="9" value="${Number(entry.level || 0)}" placeholder="Level" />
          <input class="field-input library-spell-school" value="${escapeAttr(entry.school || "")}" placeholder="School" />
          <input class="field-input library-spell-casting" value="${escapeAttr(entry.castingTime || "")}" placeholder="Casting time" />
          <input class="field-input library-spell-range" value="${escapeAttr(entry.range || "")}" placeholder="Range" />
        </div>
        <textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>
      `;
    }

    if (collection === "items") {
      return `
        <div class="fields-grid-3" style="margin-top: var(--space-3);">
          <input class="field-input library-item-type" value="${escapeAttr(entry.type || "misc")}" placeholder="Type" />
          <input class="field-input library-item-weight" type="number" step="0.1" value="${entry.weight ?? ""}" placeholder="Weight" />
          <label class="field-checkbox-row"><input type="checkbox" class="library-item-attuned" ${entry.attuned ? "checked" : ""} /> Requires attunement</label>
        </div>
        <textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>
      `;
    }

    if (collection === "resources") {
      return `
        <div class="fields-grid-2" style="margin-top: var(--space-3);">
          <input class="field-input library-resource-max" type="number" value="${Number(entry.max || 0)}" placeholder="Default max" />
          <input class="field-input library-description" value="${escapeAttr(entry.description || "")}" placeholder="Description" />
        </div>
      `;
    }

    if (["feats", "traits", "classes", "tags"].includes(collection)) {
      return `<textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>`;
    }

    return "";
  }

  function readRecordRow(collection, row) {
    const existing = Library.find(collection, row.dataset.recordId, row.dataset.recordSource) || Schema.createLibraryRecord(collection);
    const tags = (row.querySelector(".library-record-tags")?.value || "").split(",").map(tag => tag.trim()).filter(Boolean);
    const addonsRaw = row.querySelector(".library-record-addons")?.value || "{}";
    let addons = {};
    try {
      addons = JSON.parse(addonsRaw);
    } catch {
      App.showToast("Addons JSON was invalid, so addons were kept unchanged.", "error");
      addons = existing.addons || {};
    }

    const record = {
      ...existing,
      name: row.querySelector(".library-record-name")?.value.trim() || "",
      tags,
      variantOf: row.querySelector(".library-record-variant")?.value.trim() || "",
      addons,
    };

    if (collection === "spells") {
      record.level = parseInt(row.querySelector(".library-spell-level")?.value, 10) || 0;
      record.school = row.querySelector(".library-spell-school")?.value.trim() || "";
      record.castingTime = row.querySelector(".library-spell-casting")?.value.trim() || "";
      record.range = row.querySelector(".library-spell-range")?.value.trim() || "";
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (collection === "items") {
      const weight = parseFloat(row.querySelector(".library-item-weight")?.value);
      record.type = row.querySelector(".library-item-type")?.value.trim() || "misc";
      record.weight = Number.isNaN(weight) ? null : weight;
      record.attuned = row.querySelector(".library-item-attuned")?.checked || false;
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (collection === "resources") {
      record.max = parseInt(row.querySelector(".library-resource-max")?.value, 10) || 0;
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (["feats", "traits", "classes", "tags"].includes(collection)) {
      record.description = row.querySelector(".library-description")?.value || "";
    }

    return record;
  }

  function renderImports(panel) {
    panel.innerHTML = `
      <section>
        <div class="section-header">
          <span class="section-icon">API</span>
          <h3>External Imports</h3>
        </div>
        <p class="text-muted text-sm" style="margin-bottom: var(--space-4);">
          Search Open5e across all resources, or search D&amp;D 5e API indexes. Select one or many results to import into the shared library.
        </p>
        <div class="list-controls">
          <select id="import-provider" class="type-filter-select">
            <option value="open5e">Open5e</option>
            <option value="dnd5eapi">D&amp;D 5e API</option>
          </select>
          <input id="external-search" class="search-input" placeholder="Search spells, items, feats, classes..." />
          <button id="btn-external-search" class="button button-primary button-sm">Search</button>
          <button id="btn-import-selected" class="button button-ghost button-sm">Import Selected</button>
        </div>
        <div id="external-results" class="array-list" style="margin-top: var(--space-4);"></div>
      </section>
    `;

    panel.querySelector("#btn-external-search")?.addEventListener("click", () => searchExternal(panel));
    panel.querySelector("#btn-import-selected")?.addEventListener("click", () => importSelectedExternal(panel));
    panel.querySelector("#external-search")?.addEventListener("keydown", event => {
      if (event.key === "Enter") searchExternal(panel);
    });
  }

  async function searchExternal(panel) {
    const query = panel.querySelector("#external-search")?.value || "";
    const provider = panel.querySelector("#import-provider")?.value || "open5e";
    const resultsEl = panel.querySelector("#external-results");
    resultsEl.innerHTML = `<p class="text-muted text-sm">Searching...</p>`;
    try {
      const results = provider === "dnd5eapi"
        ? await Library.searchDnd5eApi(query)
        : await Library.searchOpen5e(query);
      resultsEl.innerHTML = results.map((result, index) => `
        <div class="array-item external-result" data-result-index="${index}" data-result='${escapeAttr(JSON.stringify(result))}'>
          <div class="array-item-content">
            <label class="field-checkbox-row" style="align-items: flex-start;">
              <input type="checkbox" class="external-result-checkbox" />
              <span>
                <span class="array-item-title">${escapeHTML(result.name)}</span>
                <span class="array-item-subtitle">
                  <span class="badge badge-accent">${escapeHTML(result.providerLabel || result.provider)}</span>
                  <span class="badge">${escapeHTML(result.typeLabel || result.collection)}</span>
                  ${result.sourceLabel ? `<span class="badge">${escapeHTML(result.sourceLabel)}</span>` : ""}
                </span>
              </span>
            </label>
          </div>
          <div class="array-item-actions">
            <button class="button button-primary button-sm btn-import-external">Import</button>
          </div>
        </div>
      `).join("") || `<p class="text-muted text-sm">No results.</p>`;

      resultsEl.querySelectorAll(".btn-import-external").forEach(button => {
        button.addEventListener("click", async () => {
          const row = button.closest(".external-result");
          const result = JSON.parse(row.dataset.result || "{}");
          const imported = await Library.importExternalResult(result);
          App.showToast(`Imported ${imported.name}.`, "success");
        });
      });
    } catch (error) {
      resultsEl.innerHTML = `<p class="text-danger text-sm">Search failed: ${escapeHTML(error.message)}</p>`;
    }
  }

  async function importSelectedExternal(panel) {
    const rows = Array.from(panel.querySelectorAll(".external-result"))
      .filter(row => row.querySelector(".external-result-checkbox")?.checked);
    if (!rows.length) {
      App.showToast("Select at least one result to import.", "info");
      return;
    }

    try {
      const results = rows.map(row => JSON.parse(row.dataset.result || "{}"));
      const imported = await Library.importExternalResults(results);
      App.showToast(`Imported ${imported.length} record${imported.length === 1 ? "" : "s"}.`, "success");
    } catch (error) {
      App.showToast(`Import failed: ${error.message}`, "error");
    }
  }

  function label(collection) {
    return collection.charAt(0).toUpperCase() + collection.slice(1);
  }

  function singular(collection) {
    return collection.endsWith("s") ? collection.slice(0, -1) : collection;
  }

  function escapeHTML(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  return { render };

})();
