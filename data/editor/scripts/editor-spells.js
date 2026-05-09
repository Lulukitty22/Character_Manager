/**
 * editor-spells.js
 * Shared spell editor — available to ALL character types.
 * Each spell is an individual object in the character's spells[] array.
 * Spell slots live in editor-gameplay.js.
 *
 * Exports: EditorSpells.buildTab(character) → HTMLElement
 *          EditorSpells.readTab(character)  → mutates character in-place
 */

const EditorSpells = (() => {

  // ─── Build Tab Panel ────────────────────────────────────────────────────────

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-spells";

    const spells     = (character.spells || []).map(spell => typeof Library !== "undefined" ? Library.resolveRef(spell) : spell);

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── Spell Slots (D&D only) ───────────────────────────── -->
        <!-- ── Spell List ────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">✨</span>
            <h3>Spells &amp; Cantrips</h3>
          </div>

          <div class="list-controls" style="margin-bottom: var(--space-4);">
            <input
              type="search"
              id="spell-search"
              class="search-input"
              placeholder="Filter spells by name or tag…"
            />
            <select id="spell-level-filter" class="type-filter-select">
              <option value="">All Levels</option>
              <option value="0">Cantrips</option>
              ${[1,2,3,4,5,6,7,8,9].map(level =>
                `<option value="${level}">Level ${level}</option>`
              ).join("")}
            </select>
          </div>

          <div id="spells-list" class="array-list">
            ${spells.map(spell => renderSpellRow(spell)).join("")}
          </div>

          <div class="array-add-row">
            <button class="button button-primary button-sm" id="btn-add-spell">✦ Add Spell</button>
            <button class="button button-ghost button-sm" id="btn-browse-spells">Browse Library</button>
            <button class="button button-ghost button-sm" id="btn-import-external-spell">Search Sources</button>
          </div>
        </section>

      </div>
    `;

    // Wire add spell button
    panel.querySelector("#btn-add-spell").addEventListener("click", () => {
      addSpellRow(panel);
    });
    panel.querySelector("#btn-browse-spells")?.addEventListener("click", () => browseLibrarySpells(panel));
    panel.querySelector("#btn-import-external-spell")?.addEventListener("click", () => importExternalSpell(panel));

    // Wire existing spell interactions
    wireSpellList(panel);

    // Wire search / filter
    panel.querySelector("#spell-search")?.addEventListener("input",  () => filterSpells(panel));
    panel.querySelector("#spell-level-filter")?.addEventListener("change", () => filterSpells(panel));
    ensureSpellBrowserDialog();

    return panel;
  }

  // ─── Spell Slot Editor ───────────────────────────────────────────────────────

  function renderSpellSlotEditor(spellSlots, spellcastingAbility) {
    const abilityOptions = Object.entries(Schema.ABILITY_NAMES)
      .map(([key, name]) => `<option value="${key}" ${spellcastingAbility === key ? "selected" : ""}>${name}</option>`)
      .join("");

    const slotRows = [1,2,3,4,5,6,7,8,9].map(level => {
      const slot = spellSlots[level] || { max: 0, current: 0 };
      return `
        <div class="spell-slot-row">
          <span class="spell-slot-level">Lv ${level}</span>
          <div class="spell-slot-inputs">
            <input type="number" min="0" max="20" class="field-input field-number spell-slot-current"
              data-level="${level}" value="${slot.current}" title="Current slots" />
            <span class="text-muted">/</span>
            <input type="number" min="0" max="20" class="field-input field-number spell-slot-max"
              data-level="${level}" value="${slot.max}" title="Max slots" />
          </div>
        </div>
      `;
    }).join("");

    return `
      <section>
        <div class="section-header">
          <span class="section-icon">🎯</span>
          <h3>Spell Slots</h3>
        </div>

        <div class="field-group" style="max-width: 240px; margin-bottom: var(--space-4);">
          <label class="field-label" for="spellcasting-ability">Spellcasting Ability</label>
          <select id="spellcasting-ability" class="field-select">${abilityOptions}</select>
        </div>

        <div class="spell-slots-grid">
          ${slotRows}
        </div>

        <style>
          .spell-slots-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: var(--space-3);
            margin-top: var(--space-2);
          }
          .spell-slot-row {
            display:          flex;
            flex-direction:   column;
            align-items:      center;
            gap:              var(--space-2);
            background-color: var(--color-bg-raised);
            border:           1px solid var(--color-border-subtle);
            border-radius:    var(--radius-base);
            padding:          var(--space-3);
          }
          .spell-slot-level {
            font-family:    var(--font-ui);
            font-size:      var(--text-xs);
            font-weight:    600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color:          var(--color-text-muted);
          }
          .spell-slot-inputs {
            display:     flex;
            align-items: center;
            gap:         var(--space-2);
          }
        </style>
      </section>
    `;
  }

  // ─── Spell Row Rendering ─────────────────────────────────────────────────────

  function renderSpellRow(spell) {
    const levelLabel  = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;
    const schoolLabel = spell.school || "";
    const subtitle    = [levelLabel, schoolLabel].filter(Boolean).join(" — ");
    const tags        = (spell.tags || []).map(tag => `<span class="badge">${EditorBase.escapeHTML(tag)}</span>`).join("");
    const access      = spell.access || spell.addons?.access || {};
    const accessBadge = access.label || access.state
      ? `<span class="badge">${EditorBase.escapeHTML(access.label || access.state)}</span>`
      : "";
    const preparedBadge = spell.prepared
      ? `<span class="badge badge-accent">Prepared</span>`
      : `<span class="badge">Unprepared</span>`;

    return `
      <div class="array-item spell-row"
        data-spell-id="${EditorBase.escapeAttr(spell.id)}"
        data-source="${EditorBase.escapeAttr(spell.source || "inline")}"
        data-library-collection="${EditorBase.escapeAttr(spell.libraryCollection || "")}"
        data-library-source="${EditorBase.escapeAttr(spell.librarySource || "")}"
        data-library-ref="${EditorBase.escapeAttr(spell.libraryRef || "")}"
        data-spell-access="${EditorBase.escapeAttr(JSON.stringify(access || {}))}">
        <div class="array-item-content">
          <div class="flex-between">
            <div>
              <div class="array-item-title">${EditorBase.escapeHTML(spell.name || "(Unnamed Spell)")}</div>
              <div class="array-item-subtitle">${EditorBase.escapeHTML(subtitle)}</div>
            </div>
            <div class="flex gap-2 items-center">
              ${spell.source === "library" ? `<span class="badge badge-accent">Library</span>` : ""}
              ${preparedBadge}
              ${accessBadge}
              ${tags}
            </div>
          </div>

          <!-- Expandable detail form -->
          <div class="expandable-section collapsed spell-detail-form">
            <div style="margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4);">

              <div class="fields-grid-3">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Name</label>
                  <input type="text" class="field-input spell-name"
                    placeholder="Spell name"
                    value="${EditorBase.escapeAttr(spell.name || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Level (0 = cantrip)</label>
                  <input type="number" min="0" max="9" class="field-input field-number spell-level"
                    value="${spell.level ?? 0}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">School</label>
                  <select class="field-select spell-school">
                    <option value="">—</option>
                    ${Schema.SCHOOLS_OF_MAGIC.map(school =>
                      `<option value="${school}" ${spell.school === school ? "selected" : ""}>${school}</option>`
                    ).join("")}
                  </select>
                </div>
              </div>

              <div class="fields-grid-4">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Casting Time</label>
                  <input type="text" class="field-input spell-casting-time"
                    placeholder="1 action"
                    value="${EditorBase.escapeAttr(spell.castingTime || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Range</label>
                  <input type="text" class="field-input spell-range"
                    placeholder="60 ft"
                    value="${EditorBase.escapeAttr(spell.range || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Duration</label>
                  <input type="text" class="field-input spell-duration"
                    placeholder="Instantaneous"
                    value="${EditorBase.escapeAttr(spell.duration || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Components</label>
                  <input type="text" class="field-input spell-components"
                    placeholder="V, S, M"
                    value="${EditorBase.escapeAttr((spell.components || []).join(", "))}" />
                </div>
              </div>

              <div class="field-group" style="margin-bottom:0">
                <label class="field-label">Description</label>
                <textarea class="field-textarea spell-description" rows="4"
                  placeholder="What does this spell do?">${EditorBase.escapeHTML(spell.description || "")}</textarea>
              </div>

              <div class="field-group" style="margin-bottom:0">
                <label class="field-label">Tags (comma-separated)</label>
                <input type="text" class="field-input spell-tags"
                  placeholder="damage, aoe, concentration…"
                  value="${EditorBase.escapeAttr((spell.tags || []).join(", "))}" />
              </div>

              <label class="field-checkbox-row">
                <input type="checkbox" class="spell-prepared" ${spell.prepared ? "checked" : ""} />
                Prepared / Known
              </label>

            </div>
          </div>

          <button class="expand-toggle" data-expanded="false">▸ Show details</button>
        </div>

        <div class="array-item-actions">
          <button class="button button-icon button-danger btn-remove-spell" title="Remove spell">🗑️</button>
        </div>
      </div>
    `;
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────────

  function wireSpellList(panelEl) {
    panelEl.querySelectorAll(".spell-row").forEach(rowEl => wireSpellRow(rowEl));
  }

  function wireSpellRow(rowEl) {
    const toggleBtn   = rowEl.querySelector(".expand-toggle");
    const detailForm  = rowEl.querySelector(".spell-detail-form");
    const removeBtn   = rowEl.querySelector(".btn-remove-spell");

    toggleBtn?.addEventListener("click", () => {
      const expanded = toggleBtn.dataset.expanded === "true";
      toggleBtn.dataset.expanded   = String(!expanded);
      toggleBtn.textContent        = expanded ? "▸ Show details" : "▾ Hide details";
      detailForm?.classList.toggle("collapsed", expanded);
    });

    removeBtn?.addEventListener("click", () => rowEl.remove());

    // Live-update the summary row when key fields change
    rowEl.querySelector(".spell-name")?.addEventListener("input", (event) => {
      const titleEl = rowEl.querySelector(".array-item-title");
      if (titleEl) titleEl.textContent = event.target.value || "(Unnamed Spell)";
    });

    rowEl.querySelector(".spell-level")?.addEventListener("input", (event) => {
      updateSpellSubtitle(rowEl);
    });

    rowEl.querySelector(".spell-school")?.addEventListener("change", () => {
      updateSpellSubtitle(rowEl);
    });
  }

  function updateSpellSubtitle(rowEl) {
    const level   = parseInt(rowEl.querySelector(".spell-level")?.value ?? "0", 10);
    const school  = rowEl.querySelector(".spell-school")?.value || "";
    const label   = level === 0 ? "Cantrip" : `Level ${level}`;
    const subtitle = [label, school].filter(Boolean).join(" — ");
    const subtitleEl = rowEl.querySelector(".array-item-subtitle");
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  function addSpellRow(panelEl, spell = null) {
    spell = spell || Schema.createDefaultSpell();
    const listEl = panelEl.querySelector("#spells-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderSpellRow(spell);
    const rowEl  = temp.firstElementChild;

    wireSpellRow(rowEl);

    // Auto-expand on add
    const toggleBtn  = rowEl.querySelector(".expand-toggle");
    const detailForm = rowEl.querySelector(".spell-detail-form");
    if (toggleBtn && detailForm) {
      toggleBtn.dataset.expanded = "true";
      toggleBtn.textContent      = "▾ Hide details";
      detailForm.classList.remove("collapsed");
    }

    listEl.appendChild(rowEl);
    rowEl.querySelector(".spell-name")?.focus();
  }

  async function browseLibrarySpells(panelEl) {
    try {
      await Library.loadAll();
      const existing = currentSpellSignatures(panelEl);
      const spells = Library.list("spells").filter(spell => !isDuplicateSpell(spell, existing));
      if (!spells.length) {
        App.showToast("No addable shared spells found. Existing spells are already on this character, or the library is empty.", "info");
        return;
      }
      openSpellBrowser({
        title: "Browse Library Spells",
        subtitle: "Search shared spells and preview them before adding to the character.",
        entries: spells.map(spell => ({
          id: spell.id,
          name: spell.name || "(Unnamed Spell)",
          subtitle: buildSpellSubtitle(spell),
          sourceLabel: spell.source === "srd" ? "SRD" : "Library",
          badge: spell.school || "",
          preview: renderSpellPreview(resolvePreviewSpell(spell)),
          onSelect: () => {
            addSpellRow(panelEl, Library.resolveRef(Library.createReference("spells", spell, { prepared: false })));
            App.showToast(`Added ${spell.name}.`, "success");
          },
        })),
        actionLabel: "Add Spell",
        searchPlaceholder: "Search library spells...",
      });
    } catch (error) {
      App.showToast(`Could not load spell library: ${error.message}`, "error");
    }
  }

  async function importExternalSpell(panelEl) {
    openExternalSpellBrowser(panelEl);
  }

  function ensureSpellBrowserDialog() {
    if (document.getElementById("spell-browser-dialog")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <dialog id="spell-browser-dialog" class="modal-dialog spell-browser-dialog">
        <div class="modal-content card-elevated spell-browser-shell">
          <div class="modal-header flex-between">
            <div>
              <h3 id="spell-browser-title">Spell Browser</h3>
              <p id="spell-browser-subtitle" class="text-muted text-sm"></p>
            </div>
            <button class="button button-icon button-ghost" id="btn-close-spell-browser">Close</button>
          </div>
          <div id="spell-browser-controls" class="list-controls" style="margin-bottom: 0;"></div>
          <div class="spell-browser-layout">
            <div class="spell-browser-results-pane">
              <div class="list-controls" style="margin-bottom: var(--space-3);">
                <input id="spell-browser-search" type="search" class="search-input" placeholder="Search spells..." />
              </div>
              <div id="spell-browser-results" class="array-list spell-browser-results"></div>
            </div>
            <div class="spell-browser-preview-pane">
              <div id="spell-browser-preview" class="spell-browser-preview text-muted">Select a spell to preview it.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-spell-browser-cancel" class="button button-ghost">Close</button>
            <button id="btn-spell-browser-action" class="button button-primary" disabled>Add Spell</button>
          </div>
        </div>
      </dialog>
    `;
    document.body.appendChild(wrapper.firstElementChild);
  }

  function openSpellBrowser(config) {
    ensureSpellBrowserDialog();
    const dialog = document.getElementById("spell-browser-dialog");
    const titleEl = document.getElementById("spell-browser-title");
    const subtitleEl = document.getElementById("spell-browser-subtitle");
    const controlsEl = document.getElementById("spell-browser-controls");
    const searchEl = document.getElementById("spell-browser-search");
    const resultsEl = document.getElementById("spell-browser-results");
    const previewEl = document.getElementById("spell-browser-preview");
    const actionBtn = document.getElementById("btn-spell-browser-action");
    const closeBtn = document.getElementById("btn-close-spell-browser");
    const cancelBtn = document.getElementById("btn-spell-browser-cancel");

    let selected = null;
    let entries = Array.isArray(config.entries) ? [...config.entries] : [];

    titleEl.textContent = config.title || "Spell Browser";
    subtitleEl.textContent = config.subtitle || "";
    searchEl.value = "";
    searchEl.placeholder = config.searchPlaceholder || "Search spells...";
    controlsEl.innerHTML = config.controlsHTML || "";
    previewEl.innerHTML = `<p class="text-muted">Select a spell to preview it.</p>`;
    actionBtn.textContent = config.actionLabel || "Select";
    actionBtn.disabled = true;

    const closeDialog = () => {
      actionBtn.onclick = null;
      closeBtn.onclick = null;
      cancelBtn.onclick = null;
      searchEl.oninput = null;
      dialog.close();
    };

    const renderEntries = () => {
      const query = (searchEl.value || "").trim().toLowerCase();
      const filtered = entries.filter(entry => {
        const haystack = [entry.name, entry.subtitle, entry.sourceLabel, entry.badge].filter(Boolean).join(" ").toLowerCase();
        return !query || haystack.includes(query);
      });

      resultsEl.innerHTML = filtered.map((entry, index) => `
        <button type="button" class="array-item spell-browser-row ${selected?.id === entry.id ? "active" : ""}" data-entry-index="${index}">
          <div class="array-item-content">
            <div class="array-item-title">${EditorBase.escapeHTML(entry.name || "(Unnamed Spell)")}</div>
            <div class="array-item-subtitle">
              ${entry.subtitle ? EditorBase.escapeHTML(entry.subtitle) : ""}
              ${entry.sourceLabel ? `<span class="badge">${EditorBase.escapeHTML(entry.sourceLabel)}</span>` : ""}
              ${entry.badge ? `<span class="badge badge-accent">${EditorBase.escapeHTML(entry.badge)}</span>` : ""}
            </div>
          </div>
        </button>
      `).join("") || `<p class="text-muted text-sm">No spells found.</p>`;

      resultsEl.querySelectorAll(".spell-browser-row").forEach((row, index) => {
        row.addEventListener("click", async () => {
          const entry = filtered[index];
          selected = entry;
          actionBtn.disabled = false;
          renderEntries();
          previewEl.innerHTML = `<p class="text-muted text-sm">Loading preview...</p>`;
          try {
            previewEl.innerHTML = typeof entry.preview === "function"
              ? await entry.preview()
              : entry.preview || `<p class="text-muted">No preview available.</p>`;
          } catch (error) {
            previewEl.innerHTML = `<p class="text-danger text-sm">Preview failed: ${EditorBase.escapeHTML(error.message)}</p>`;
          }
        });
      });
    };

    searchEl.oninput = renderEntries;
    closeBtn.onclick = closeDialog;
    cancelBtn.onclick = closeDialog;
    actionBtn.onclick = async () => {
      if (!selected?.onSelect) return;
      await selected.onSelect();
      closeDialog();
    };

    renderEntries();
    if (!dialog.open) dialog.showModal();
  }

  async function openExternalSpellBrowser(panelEl) {
    try {
      openSpellBrowser({
        title: "Search External Spell Sources",
        subtitle: "Search Open5e or the D&D 5e API, preview the result, then import and add it.",
        entries: [],
        actionLabel: "Import & Add",
        searchPlaceholder: "Search external spells...",
        controlsHTML: `
          <select id="spell-browser-provider" class="type-filter-select">
            <option value="open5e">Open5e</option>
            <option value="dnd5eapi">D&D 5e API</option>
          </select>
          <button id="btn-spell-browser-run-search" class="button button-primary button-sm" type="button">Search</button>
        `,
      });

      const providerEl = document.getElementById("spell-browser-provider");
      const runSearchBtn = document.getElementById("btn-spell-browser-run-search");
      const searchEl = document.getElementById("spell-browser-search");
      const resultsEl = document.getElementById("spell-browser-results");
      const previewEl = document.getElementById("spell-browser-preview");
      const actionBtn = document.getElementById("btn-spell-browser-action");

      const bindExternalSearchControls = () => {
        document.getElementById("btn-spell-browser-run-search")?.addEventListener("click", runSearch);
        document.getElementById("spell-browser-search")?.addEventListener("keydown", event => {
          if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
          }
        });
      };

      const runSearch = async () => {
        const existing = currentSpellSignatures(panelEl);
        const currentSearchEl = document.getElementById("spell-browser-search");
        const currentProviderEl = document.getElementById("spell-browser-provider");
        const query = (currentSearchEl?.value || "").trim();
        const provider = currentProviderEl?.value || "open5e";
        const providerLabel = provider === "dnd5eapi" ? "D&D 5e API" : "Open5e";
        if (!query) {
          App.showToast("Enter a spell name to search.", "info");
          return;
        }
        resultsEl.innerHTML = `<p class="text-muted text-sm">Searching ${EditorBase.escapeHTML(providerLabel)}...</p>`;
        previewEl.innerHTML = `<p class="text-muted">Select a spell to preview it.</p>`;
        actionBtn.disabled = true;

        try {
          const allResults = provider === "dnd5eapi"
            ? await Library.searchDnd5eApi(query)
            : await Library.searchOpen5e(query);
          const results = allResults
            .filter(result => result.collection === "spells")
            .filter(result => !isDuplicateSpell(result, existing));
          if (!results.length) {
            resultsEl.innerHTML = `<p class="text-muted text-sm">No new ${EditorBase.escapeHTML(providerLabel)} spell results found.</p>`;
            return;
          }

          openSpellBrowser({
            title: "Search External Spell Sources",
            subtitle: "Search Open5e or the D&D 5e API, preview the result, then import and add it.",
            entries: results.map(result => ({
              id: result.id,
              name: result.name || "(Unnamed Spell)",
              subtitle: result.typeLabel || "Spell",
              sourceLabel: result.sourceLabel || result.providerLabel || "",
              badge: result.providerLabel || "",
              preview: async () => {
                const detail = await Library.fetchExternalDetail(result).catch(() => result.raw || result);
                return renderSpellPreview(resolvePreviewSpell(result, detail));
              },
              onSelect: async () => {
                const imported = await Library.importExternalResult(result);
                addSpellRow(panelEl, Library.resolveRef(Library.createReference("spells", imported, { prepared: false })));
                App.showToast(`Imported ${imported.name}.`, "success");
              },
            })),
            actionLabel: "Import & Add",
            searchPlaceholder: "Search external spells...",
            controlsHTML: `
              <select id="spell-browser-provider" class="type-filter-select">
                <option value="open5e" ${provider === "open5e" ? "selected" : ""}>Open5e</option>
                <option value="dnd5eapi" ${provider === "dnd5eapi" ? "selected" : ""}>D&D 5e API</option>
              </select>
              <button id="btn-spell-browser-run-search" class="button button-primary button-sm" type="button">Search</button>
            `,
          });
          document.getElementById("spell-browser-search").value = query;
          bindExternalSearchControls();
        } catch (error) {
          resultsEl.innerHTML = `<p class="text-danger text-sm">${EditorBase.escapeHTML(providerLabel)} search failed: ${EditorBase.escapeHTML(error.message)}</p>`;
        }
      };

      bindExternalSearchControls();
    } catch (error) {
      App.showToast(`Could not search spell sources: ${error.message}`, "error");
    }
  }

  function buildSpellSubtitle(spell) {
    const levelLabel = Number(spell.level || 0) === 0 ? "Cantrip" : `Level ${Number(spell.level || 0)}`;
    return [levelLabel, spell.school || "", spell.castingTime || ""].filter(Boolean).join(" | ");
  }

  function resolvePreviewSpell(spell, detail = null) {
    if (detail) {
      return {
        name: detail.name || spell.name || "(Unnamed Spell)",
        level: Number(detail.level ?? spell.level ?? 0) || 0,
        school: detail.school?.name || detail.school || spell.school || "",
        castingTime: detail.casting_time || detail.castingTime || spell.castingTime || "",
        range: detail.range || spell.range || "",
        duration: detail.duration || spell.duration || "",
        components: Array.isArray(detail.components) ? detail.components : (spell.components || []),
        description: normalizePreviewDescription(detail.desc || detail.description || spell.description || ""),
        tags: spell.tags || [],
        sourceLabel: spell.sourceLabel || spell.providerLabel || "",
      };
    }

    return {
      name: spell.name || "(Unnamed Spell)",
      level: Number(spell.level || 0) || 0,
      school: spell.school || "",
      castingTime: spell.castingTime || "",
      range: spell.range || "",
      duration: spell.duration || "",
      components: spell.components || [],
      description: normalizePreviewDescription(spell.description || ""),
      tags: spell.tags || [],
      sourceLabel: spell.source === "srd" ? "SRD" : (spell.source || "Library"),
    };
  }

  function renderSpellPreview(spell) {
    const levelLabel = Number(spell.level || 0) === 0 ? "Cantrip" : `Level ${Number(spell.level || 0)}`;
    const tags = (spell.tags || []).map(tag => `<span class="badge">${EditorBase.escapeHTML(tag)}</span>`).join("");
    return `
      <div class="spell-browser-preview-card">
        <div class="flex-between" style="align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-3);">
          <div>
            <div class="array-item-title">${EditorBase.escapeHTML(spell.name || "(Unnamed Spell)")}</div>
            <div class="array-item-subtitle">${EditorBase.escapeHTML([levelLabel, spell.school, spell.sourceLabel].filter(Boolean).join(" | "))}</div>
          </div>
          <div class="flex gap-2 flex-wrap">${tags}</div>
        </div>
        <div class="fields-grid-2" style="margin-bottom: var(--space-3);">
          <div class="card" style="padding: var(--space-3);">
            <div class="text-muted text-xs">Casting Time</div>
            <div>${EditorBase.escapeHTML(spell.castingTime || "-")}</div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div class="text-muted text-xs">Range</div>
            <div>${EditorBase.escapeHTML(spell.range || "-")}</div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div class="text-muted text-xs">Duration</div>
            <div>${EditorBase.escapeHTML(spell.duration || "-")}</div>
          </div>
          <div class="card" style="padding: var(--space-3);">
            <div class="text-muted text-xs">Components</div>
            <div>${EditorBase.escapeHTML((spell.components || []).join(", ") || "-")}</div>
          </div>
        </div>
        <div class="card" style="padding: var(--space-4); white-space: pre-wrap;">${EditorBase.escapeHTML(spell.description || "No description available.")}</div>
      </div>
    `;
  }

  function normalizePreviewDescription(value) {
    if (Array.isArray(value)) return value.join("\n\n");
    return String(value || "").replace(/<[^>]+>/g, "");
  }

  function currentSpellSignatures(panelEl) {
    const rows = Array.from(panelEl.querySelectorAll("#spells-list .spell-row"));
    return new Set(rows.flatMap(rowEl => {
      const libraryRef = rowEl.dataset.libraryRef ? `ref:${rowEl.dataset.libraryRef}` : null;
      const level = parseInt(rowEl.querySelector(".spell-level")?.value || "0", 10) || 0;
      const name = normalizeSpellName(rowEl.querySelector(".spell-name")?.value || rowEl.querySelector(".array-item-title")?.textContent || "");
      return [libraryRef, name ? `name:${name}|${level}` : null].filter(Boolean);
    }));
  }

  function isDuplicateSpell(spell, signatures) {
    const nameKey = `name:${normalizeSpellName(spell.name || "")}|${Number(spell.level || 0)}`;
    return signatures.has(`ref:${spell.id}`) || signatures.has(nameKey);
  }

  function normalizeSpellName(name) {
    return String(name || "").trim().toLowerCase();
  }

  // ─── Filter ──────────────────────────────────────────────────────────────────

  function filterSpells(panelEl) {
    const query       = (panelEl.querySelector("#spell-search")?.value || "").toLowerCase();
    const levelFilter = panelEl.querySelector("#spell-level-filter")?.value || "";

    panelEl.querySelectorAll(".spell-row").forEach(rowEl => {
      const name  = (rowEl.querySelector(".spell-name")?.value || rowEl.querySelector(".array-item-title")?.textContent || "").toLowerCase();
      const level = rowEl.querySelector(".spell-level")?.value || "";
      const tags  = (rowEl.querySelector(".spell-tags")?.value || "").toLowerCase();

      const matchesSearch = !query || name.includes(query) || tags.includes(query);
      const matchesLevel  = !levelFilter || level === levelFilter;

      rowEl.style.display = matchesSearch && matchesLevel ? "" : "none";
    });
  }

  // ─── Read Tab ────────────────────────────────────────────────────────────────

  function readTab(character) {
    // Read spells
    const spellRows = document.querySelectorAll("#spells-list .spell-row");
    character.spells = Array.from(spellRows).map(rowEl => {
      const id = rowEl.dataset.spellId || Schema.generateId();

      const componentsRaw = rowEl.querySelector(".spell-components")?.value || "";
      const components    = componentsRaw.split(",").map(c => c.trim()).filter(Boolean);

      const tagsRaw = rowEl.querySelector(".spell-tags")?.value || "";
      const tags    = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);

      const spell = {
        id,
        name:        rowEl.querySelector(".spell-name")?.value.trim()        || "",
        level:       parseInt(rowEl.querySelector(".spell-level")?.value,  10) || 0,
        school:      rowEl.querySelector(".spell-school")?.value             || "",
        castingTime: rowEl.querySelector(".spell-casting-time")?.value.trim() || "",
        range:       rowEl.querySelector(".spell-range")?.value.trim()        || "",
        components,
        duration:    rowEl.querySelector(".spell-duration")?.value.trim()     || "",
        description: rowEl.querySelector(".spell-description")?.value         || "",
        prepared:    rowEl.querySelector(".spell-prepared")?.checked          || false,
        access:      parseJsonDataset(rowEl.dataset.spellAccess, null),
        tags,
      };

      if (rowEl.dataset.source === "library") {
        const base = Library.find("spells", rowEl.dataset.libraryRef, rowEl.dataset.librarySource) || {};
        const overrides = diffAgainstBase(spell, base, ["prepared", "access"]);
        return {
          id,
          source: "library",
          libraryCollection: "spells",
          librarySource: rowEl.dataset.librarySource || "custom",
          libraryRef: rowEl.dataset.libraryRef,
          prepared: spell.prepared,
          access: spell.access,
          overrides,
        };
      }

      return spell;
    }).filter(spell => spell.name || spell.libraryRef);

    return character;
  }

  function diffAgainstBase(current, base, localKeys = []) {
    const overrides = {};
    Object.keys(current).forEach(key => {
      if (["id", "source", "libraryCollection", "librarySource", "libraryRef", ...localKeys].includes(key)) return;
      const currentValue = current[key];
      const baseValue = base[key];
      if (JSON.stringify(currentValue) !== JSON.stringify(baseValue)) {
        overrides[key] = currentValue;
      }
    });
    return overrides;
  }

  function parseJsonDataset(value, fallback) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    buildTab,
    readTab,
    openBrowser: openSpellBrowser,
  };

})();

if (typeof globalThis !== "undefined") globalThis.EditorSpells = EditorSpells;
