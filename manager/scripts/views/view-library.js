/**
 * view-library.js
 * Repo-backed shared library management view.
 */

const ViewLibrary = (() => {

  const EDITABLE_COLLECTIONS = ["spells", "items", "resources", "tags", "feats", "traits", "classes", "races"];

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
            <p class="text-muted text-sm">Reusable records for spells, items, resources, tags, feats, traits, classes, and races.</p>
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
        <div class="list-controls" style="margin-bottom: var(--space-4);">
          <input
            id="library-record-search"
            type="search"
            class="search-input"
            placeholder="Search ${label(collection).toLowerCase()} by name, tag, source, or description..."
          />
        </div>
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

    panel.querySelector("#library-record-search")?.addEventListener("input", (event) => {
      filterRecordRows(panel, event.target.value);
    });
  }

  function renderRecordRow(collection, entry) {
    const addons = JSON.stringify(entry.addons || {}, null, 2);
    const sourceDocuments = [
      entry.addons?.sourceDocument ? { ...entry.addons.sourceDocument, primary: true } : null,
      ...(Array.isArray(entry.addons?.sourceDocuments) ? entry.addons.sourceDocuments : []),
    ].filter(Boolean);
    const searchText = [
      entry.name,
      entry.description,
      entry.source,
      entry.provider,
      entry.providerId,
      entry.variantOf,
      entry.tags || [],
      entry.addons?.sourceDocument?.title,
      entry.addons?.sourceDocument?.publisher,
      entry.addons?.sourceDocument?.gameSystem,
      ...(Array.isArray(entry.addons?.sourceDocuments)
        ? entry.addons.sourceDocuments.flatMap(doc => [doc?.title, doc?.publisher, doc?.gameSystem, doc?.detailUrl])
        : []),
    ].flat().filter(Boolean).join(" ");

    return `
      <div class="array-item library-record-row"
        data-record-id="${escapeAttr(entry.id)}"
        data-record-source="${escapeAttr(entry.source || "custom")}"
        data-search="${escapeAttr(searchText)}">
        <div class="array-item-content">
          <div class="fields-grid-3">
            <input class="field-input library-record-name" value="${escapeAttr(entry.name || "")}" placeholder="Name" />
            <input class="field-input library-record-tags" value="${escapeAttr((entry.tags || []).join(", "))}" placeholder="tags, comma, separated" />
            <input class="field-input library-record-variant" value="${escapeAttr(entry.variantOf || "")}" placeholder="Variant of record id" />
          </div>
          ${renderFeatureFields(collection, entry)}
          ${renderSourceSummary(sourceDocuments)}
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

  function filterRecordRows(panel, query) {
    const needle = String(query || "").trim().toLowerCase();
    panel.querySelectorAll(".library-record-row").forEach(row => {
      const searchable = (row.dataset.search || row.textContent || "").toLowerCase();
      row.style.display = !needle || searchable.includes(needle) ? "" : "none";
    });
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
      const action = Array.isArray(entry.addons?.actions) ? entry.addons.actions[0] || {} : {};
      const healDice = entry.addons?.healing?.dice || action.effects?.heal?.dice || "";
      const healAmount = Number(entry.addons?.healing?.amount || action.effects?.heal?.amount || 0);
      const tempHp = Number(entry.addons?.effects?.hp?.tempHp || action.effects?.tempHp?.amount || action.effects?.tempHp || 0);
      const flatHp = Number(entry.addons?.effects?.hp?.flatBonus || 0);
      const perLevelHp = Number(entry.addons?.effects?.hp?.perLevelBonus || 0);
      const slotBonuses = formatSlotBonusMap(entry.addons?.effects?.spellSlots?.bonusByLevel || {});
      const slotRestore = formatSlotRestore(action.effects?.spellSlots || null);
      const resourceEffects = formatResourceEffects(action.effects?.resources || []);
      return `
        <div class="fields-grid-3" style="margin-top: var(--space-3);">
          <input class="field-input library-item-type" value="${escapeAttr(entry.type || "misc")}" placeholder="Type" />
          <input class="field-input library-item-weight" type="number" step="0.1" value="${entry.weight ?? ""}" placeholder="Weight" />
          <label class="field-checkbox-row"><input type="checkbox" class="library-item-attuned" ${entry.attuned ? "checked" : ""} /> Requires attunement</label>
        </div>
        <div class="fields-grid-3" style="margin-top: var(--space-3);">
          <input class="field-input library-item-heal-dice" value="${escapeAttr(healDice)}" placeholder="Heal dice, e.g. 2d4 + 2" />
          <input class="field-input library-item-heal-amount" type="number" value="${healAmount || ""}" placeholder="Flat heal amount" />
          <input class="field-input library-item-temp-hp" type="number" value="${tempHp || ""}" placeholder="Temp HP on use" />
        </div>
        <div class="fields-grid-3" style="margin-top: var(--space-3);">
          <input class="field-input library-item-hp-flat" type="number" value="${flatHp || ""}" placeholder="Passive max HP bonus" />
          <input class="field-input library-item-hp-level" type="number" value="${perLevelHp || ""}" placeholder="Passive HP per level" />
          <input class="field-input library-item-action-label" value="${escapeAttr(action.label || "")}" placeholder="Action label, e.g. Drink" />
        </div>
        <div class="fields-grid-2" style="margin-top: var(--space-3);">
          <input class="field-input library-item-slot-bonuses" value="${escapeAttr(slotBonuses)}" placeholder="Passive slot bonuses, e.g. 1:+1, 3:+1" />
          <input class="field-input library-item-slot-restore" value="${escapeAttr(slotRestore)}" placeholder="Use restores slots: all or 3:+1" />
        </div>
        <div class="fields-grid-2" style="margin-top: var(--space-3);">
          <input class="field-input library-item-resource-effects" value="${escapeAttr(resourceEffects)}" placeholder="Resource effects, e.g. Arrows:-1 or Arrows:+20" />
          <div class="text-muted text-sm" style="align-self:center;">Targets a character resource by name or id when the item action is used.</div>
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

    if (collection === "classes") {
      return `
        <div class="fields-grid-2" style="margin-top: var(--space-3);">
          <input class="field-input library-class-hit-die" value="${escapeAttr(entry.hitDie || "")}" placeholder="Hit die, e.g. d8" />
          <input class="field-input library-class-primary" value="${escapeAttr(entry.primaryAbility || "")}" placeholder="Primary ability" />
        </div>
        <textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>
      `;
    }

    if (collection === "races") {
      const speed = entry.speed?.walk ?? "";
      return `
        <div class="fields-grid-3" style="margin-top: var(--space-3);">
          <input class="field-input library-race-speed" type="number" value="${speed}" placeholder="Walk speed" />
          <input class="field-input library-race-hp-flat" type="number" value="${Number(entry.addons?.hp?.flatBonus || 0)}" placeholder="Flat HP bonus" />
          <input class="field-input library-race-hp-level" type="number" value="${Number(entry.addons?.hp?.perLevelBonus || 0)}" placeholder="HP per level" />
        </div>
        <textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>
      `;
    }

    if (["feats", "traits", "tags"].includes(collection)) {
      return `<textarea class="field-textarea library-description" rows="3" style="margin-top: var(--space-3);" placeholder="Description">${escapeHTML(entry.description || "")}</textarea>`;
    }

    return "";
  }

  function renderSourceSummary(sourceDocuments) {
    if (!sourceDocuments || !sourceDocuments.length) return "";

    return `
      <div class="field-group" style="margin-top: var(--space-3); margin-bottom: 0;">
        <label class="field-label">Sources</label>
        <div style="display:flex; flex-wrap:wrap; gap: var(--space-2);">
          ${sourceDocuments.map(doc => {
            const label = [doc.title || doc.name || doc.type || doc.provider || "Source", doc.provider || "", doc.gameSystem || ""]
              .filter(Boolean)
              .join(" · ");
            const title = [doc.detailUrl || "", doc.publisher || ""].filter(Boolean).join(" | ");
            return `<span class="badge ${doc.primary ? "badge-accent" : ""}" title="${escapeAttr(title)}">${escapeHTML(label)}</span>`;
          }).join("")}
        </div>
      </div>
    `;
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
      const healDice = row.querySelector(".library-item-heal-dice")?.value.trim() || "";
      const healAmount = parseInt(row.querySelector(".library-item-heal-amount")?.value, 10) || 0;
      const tempHp = parseInt(row.querySelector(".library-item-temp-hp")?.value, 10) || 0;
      const flatHp = parseInt(row.querySelector(".library-item-hp-flat")?.value, 10) || 0;
      const perLevelHp = parseInt(row.querySelector(".library-item-hp-level")?.value, 10) || 0;
      const actionLabel = row.querySelector(".library-item-action-label")?.value.trim() || "";
      const slotBonuses = parseSlotBonusMap(row.querySelector(".library-item-slot-bonuses")?.value || "");
      const slotRestore = parseSlotRestore(row.querySelector(".library-item-slot-restore")?.value || "");
      const resourceEffects = parseResourceEffects(row.querySelector(".library-item-resource-effects")?.value || "");
      record.type = row.querySelector(".library-item-type")?.value.trim() || "misc";
      record.weight = Number.isNaN(weight) ? null : weight;
      record.attuned = row.querySelector(".library-item-attuned")?.checked || false;
      record.description = row.querySelector(".library-description")?.value || "";
      record.addons = {
        ...(record.addons || {}),
        equipment: {
          ...(record.addons?.equipment || {}),
        },
        effects: {
          ...(record.addons?.effects || {}),
          hp: {
            ...(record.addons?.effects?.hp || {}),
            flatBonus: flatHp,
            perLevelBonus: perLevelHp,
            tempHp,
          },
          spellSlots: {
            ...(record.addons?.effects?.spellSlots || {}),
            bonusByLevel: slotBonuses,
          },
        },
      };
      if (healDice || healAmount || tempHp || slotRestore || resourceEffects.length) {
        if (healDice || healAmount) {
          record.addons.healing = {
            ...(record.addons.healing || {}),
            ...(healDice ? { dice: healDice } : {}),
            ...(healAmount ? { amount: healAmount } : {}),
          };
        } else {
          delete record.addons.healing;
        }
        record.addons.actions = [{
          label: actionLabel || "Use",
          consumeQuantity: record.type === "consumable",
          effects: {
            ...(healDice || healAmount ? {
              heal: {
                ...(healDice ? { dice: healDice } : {}),
                ...(healAmount ? { amount: healAmount } : {}),
              },
            } : {}),
            ...(tempHp ? { tempHp: { amount: tempHp } } : {}),
            ...(slotRestore ? { spellSlots: slotRestore } : {}),
            ...(resourceEffects.length ? { resources: resourceEffects } : {}),
          },
          description: record.description || "",
        }];
      } else {
        delete record.addons.healing;
        delete record.addons.actions;
      }
    }

    if (collection === "resources") {
      record.max = parseInt(row.querySelector(".library-resource-max")?.value, 10) || 0;
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (collection === "classes") {
      record.hitDie = row.querySelector(".library-class-hit-die")?.value.trim() || "";
      record.primaryAbility = row.querySelector(".library-class-primary")?.value.trim() || "";
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (collection === "races") {
      record.speed = {
        ...(record.speed || {}),
        walk: parseInt(row.querySelector(".library-race-speed")?.value, 10) || 30,
      };
      record.addons = {
        ...(record.addons || {}),
        hp: {
          ...(record.addons?.hp || {}),
          flatBonus: parseInt(row.querySelector(".library-race-hp-flat")?.value, 10) || 0,
          perLevelBonus: parseInt(row.querySelector(".library-race-hp-level")?.value, 10) || 0,
        },
      };
      record.description = row.querySelector(".library-description")?.value || "";
    }

    if (["feats", "traits", "tags"].includes(collection)) {
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
    ensureExternalPreviewDialog();
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
        <div class="array-item external-result external-result-clickable" data-result-index="${index}" data-result='${escapeAttr(JSON.stringify(result))}'>
          <div class="array-item-content">
            <div class="field-checkbox-row" style="align-items: flex-start;">
              <input type="checkbox" class="external-result-checkbox" />
              <span>
                <span class="array-item-title">${escapeHTML(result.name)}</span>
                <span class="array-item-subtitle">
                  <span class="badge badge-accent">${escapeHTML(result.providerLabel || result.provider)}</span>
                  <span class="badge">${escapeHTML(result.typeLabel || result.collection)}</span>
                  ${result.sourceLabel ? `<span class="badge">${escapeHTML(result.sourceLabel)}</span>` : ""}
                </span>
              </span>
            </div>
          </div>
          <div class="array-item-actions">
            <button class="button button-primary button-sm btn-import-external">Import</button>
          </div>
        </div>
      `).join("") || `<p class="text-muted text-sm">No results.</p>`;

      resultsEl.querySelectorAll(".btn-import-external").forEach(button => {
        button.addEventListener("click", async event => {
          event.stopPropagation();
          const row = button.closest(".external-result");
          const result = JSON.parse(row.dataset.result || "{}");
          const imported = await Library.importExternalResult(result);
          App.showToast(`Imported ${imported.name}.`, "success");
        });
      });

      resultsEl.querySelectorAll(".external-result").forEach(row => {
        row.addEventListener("click", async event => {
          if (event.target.closest(".external-result-checkbox, .btn-import-external")) return;
          const result = JSON.parse(row.dataset.result || "{}");
          await openExternalPreview(result);
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

  function ensureExternalPreviewDialog() {
    if (document.getElementById("external-preview-dialog")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <dialog id="external-preview-dialog" class="modal-dialog spell-browser-dialog">
        <div class="modal-content card-elevated spell-browser-shell">
          <div class="modal-header flex-between">
            <div>
              <h3 id="external-preview-title">Spell Preview</h3>
              <p id="external-preview-subtitle" class="text-muted text-sm"></p>
            </div>
            <button class="button button-icon button-ghost" id="btn-close-external-preview">Close</button>
          </div>
          <div id="external-preview-body" class="spell-browser-preview"></div>
          <div class="modal-footer">
            <button id="btn-dismiss-external-preview" class="button button-ghost">Close</button>
          </div>
        </div>
      </dialog>
    `;
    document.body.appendChild(wrapper.firstElementChild);
  }

  async function openExternalPreview(result) {
    ensureExternalPreviewDialog();
    const dialog = document.getElementById("external-preview-dialog");
    const titleEl = document.getElementById("external-preview-title");
    const subtitleEl = document.getElementById("external-preview-subtitle");
    const bodyEl = document.getElementById("external-preview-body");
    const closeBtn = document.getElementById("btn-close-external-preview");
    const dismissBtn = document.getElementById("btn-dismiss-external-preview");

    titleEl.textContent = result.name || "Spell Preview";
    subtitleEl.textContent = [result.providerLabel || result.provider, result.sourceLabel || ""].filter(Boolean).join(" | ");
    bodyEl.innerHTML = `<p class="text-muted text-sm">Loading preview...</p>`;

    const closeDialog = () => {
      closeBtn.onclick = null;
      dismissBtn.onclick = null;
      dialog.close();
    };
    closeBtn.onclick = closeDialog;
    dismissBtn.onclick = closeDialog;

    dialog.showModal();

    try {
      const detail = await Library.fetchExternalDetail(result).catch(() => result.raw || result);
      bodyEl.innerHTML = renderExternalRecordPreview(result, detail);
    } catch (error) {
      bodyEl.innerHTML = `<p class="text-danger text-sm">Preview failed: ${escapeHTML(error.message)}</p>`;
    }
  }

  function renderExternalRecordPreview(result, detail = {}) {
    if (result.collection === "spells") {
      return renderExternalSpellPreview(result, detail);
    }
    if (result.collection === "items") {
      return renderExternalItemPreview(result, detail);
    }
    return renderExternalGenericPreview(result, detail);
  }

  function renderExternalSpellPreview(result, detail = {}) {
    const level = Number(detail.level || 0);
    const levelLabel = level === 0 ? "Cantrip" : `Level ${level}`;
    const school = detail.school?.name || detail.school || "";
    const castingTime = detail.casting_time || detail.castingTime || "";
    const range = detail.range || "";
    const duration = detail.duration || "";
    const components = Array.isArray(detail.components) ? detail.components.join(", ") : "";
    const description = normalizePreviewDescription(detail.desc || detail.description || "");

    return `
      <div class="spell-browser-preview-card">
        <div class="array-item-title" style="margin-bottom: var(--space-1);">${escapeHTML(detail.name || result.name || "(Unnamed Spell)")}</div>
        <div class="array-item-subtitle" style="margin-bottom: var(--space-3);">${escapeHTML([levelLabel, school, result.sourceLabel || ""].filter(Boolean).join(" | "))}</div>
        <div class="fields-grid-2" style="margin-bottom: var(--space-3);">
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Casting Time</div><div>${escapeHTML(castingTime || "-")}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Range</div><div>${escapeHTML(range || "-")}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Duration</div><div>${escapeHTML(duration || "-")}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Components</div><div>${escapeHTML(components || "-")}</div></div>
        </div>
        <div class="card" style="padding: var(--space-4); white-space: pre-wrap;">${escapeHTML(description || "No description available.")}</div>
      </div>
    `;
  }

  function renderExternalItemPreview(result, detail = {}) {
    const type = detail.equipment_category?.name || detail.gear_category?.name || detail.rarity?.name || result.typeLabel || "Item";
    const weight = detail.weight != null ? `${detail.weight} lb` : "-";
    const attuned = detail.requires_attunement ? "Yes" : "No";
    const description = normalizePreviewDescription(detail.desc || detail.description || detail.text || "");

    return `
      <div class="spell-browser-preview-card">
        <div class="array-item-title" style="margin-bottom: var(--space-1);">${escapeHTML(detail.name || result.name || "(Unnamed Item)")}</div>
        <div class="array-item-subtitle" style="margin-bottom: var(--space-3);">${escapeHTML([type, result.sourceLabel || ""].filter(Boolean).join(" | "))}</div>
        <div class="fields-grid-2" style="margin-bottom: var(--space-3);">
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Type</div><div>${escapeHTML(type)}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Weight</div><div>${escapeHTML(weight)}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Attunement</div><div>${escapeHTML(attuned)}</div></div>
          <div class="card" style="padding: var(--space-3);"><div class="text-muted text-xs">Source</div><div>${escapeHTML(result.providerLabel || result.provider || "-")}</div></div>
        </div>
        <div class="card" style="padding: var(--space-4); white-space: pre-wrap;">${escapeHTML(description || "No description available.")}</div>
      </div>
    `;
  }

  function renderExternalGenericPreview(result, detail = {}) {
    const description = normalizePreviewDescription(detail.desc || detail.description || detail.text || "");
    const fields = Object.entries(detail)
      .filter(([key, value]) => value != null && typeof value !== "object" && String(value).trim() !== "")
      .slice(0, 6);

    return `
      <div class="spell-browser-preview-card">
        <div class="array-item-title" style="margin-bottom: var(--space-1);">${escapeHTML(detail.name || result.name || "(Unnamed Record)")}</div>
        <div class="array-item-subtitle" style="margin-bottom: var(--space-3);">${escapeHTML([result.typeLabel || result.collection, result.sourceLabel || ""].filter(Boolean).join(" | "))}</div>
        ${fields.length ? `
          <div class="fields-grid-2" style="margin-bottom: var(--space-3);">
            ${fields.map(([key, value]) => `
              <div class="card" style="padding: var(--space-3);">
                <div class="text-muted text-xs">${escapeHTML(key)}</div>
                <div>${escapeHTML(String(value))}</div>
              </div>
            `).join("")}
          </div>
        ` : ""}
        <div class="card" style="padding: var(--space-4); white-space: pre-wrap;">${escapeHTML(description || "No description available.")}</div>
      </div>
    `;
  }

  function normalizePreviewDescription(value) {
    if (Array.isArray(value)) return value.join("\n\n");
    return String(value || "").replace(/<[^>]+>/g, "");
  }

  function formatSlotBonusMap(map) {
    return Object.entries(map || {})
      .filter(([, value]) => Number(value || 0))
      .map(([level, value]) => `${level}:${Schema.formatModifier(Number(value || 0))}`)
      .join(", ");
  }

  function parseSlotBonusMap(value) {
    return String(value || "").split(",").reduce((map, chunk) => {
      const match = chunk.trim().match(/^(\d)\s*:\s*([+-]?\d+)$/);
      if (!match) return map;
      map[Number(match[1])] = Number(match[2]);
      return map;
    }, {});
  }

  function formatSlotRestore(effect) {
    if (!effect) return "";
    if (effect.all) return "all";
    if (effect.level) return `${effect.level}:${Schema.formatModifier(Number(effect.amount || 1))}`;
    return "";
  }

  function parseSlotRestore(value) {
    const clean = String(value || "").trim().toLowerCase();
    if (!clean) return null;
    if (clean === "all") return { all: true };
    const match = clean.match(/^(\d)\s*:\s*([+-]?\d+)$/);
    if (!match) return null;
    return {
      level: Number(match[1]),
      amount: Number(match[2]),
    };
  }

  function formatResourceEffects(effects = []) {
    return (effects || [])
      .map(effect => {
        const target = effect.target || effect.resourceName || "";
        const delta = Number(effect.delta || 0);
        return target && delta ? `${target}:${Schema.formatModifier(delta)}` : "";
      })
      .filter(Boolean)
      .join(", ");
  }

  function parseResourceEffects(value) {
    return String(value || "").split(",").map(chunk => chunk.trim()).filter(Boolean).reduce((effects, chunk) => {
      const match = chunk.match(/^(.+?)\s*:\s*([+-]?\d+)$/);
      if (!match) return effects;
      effects.push({
        target: match[1].trim(),
        delta: Number(match[2]),
      });
      return effects;
    }, []);
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
