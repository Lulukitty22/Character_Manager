/**
 * editor-spells.js
 * Shared spell editor — available to ALL character types.
 * Each spell is an individual object in the character's spells[] array.
 * Also manages spell slots for D&D characters.
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

    const spells     = character.spells     || [];
    const spellSlots = character.spellSlots || {};
    const isDnd      = character.dnd != null || character.boss != null;

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── Spell Slots (D&D only) ───────────────────────────── -->
        ${isDnd ? renderSpellSlotEditor(spellSlots, character.dnd?.spellcastingAbility || "") : ""}

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
          </div>
        </section>

      </div>
    `;

    // Wire add spell button
    panel.querySelector("#btn-add-spell").addEventListener("click", () => {
      addSpellRow(panel);
    });

    // Wire existing spell interactions
    wireSpellList(panel);

    // Wire search / filter
    panel.querySelector("#spell-search")?.addEventListener("input",  () => filterSpells(panel));
    panel.querySelector("#spell-level-filter")?.addEventListener("change", () => filterSpells(panel));

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
    const preparedBadge = spell.prepared
      ? `<span class="badge badge-accent">Prepared</span>`
      : `<span class="badge">Unprepared</span>`;

    return `
      <div class="array-item spell-row" data-spell-id="${EditorBase.escapeAttr(spell.id)}">
        <div class="array-item-content">
          <div class="flex-between">
            <div>
              <div class="array-item-title">${EditorBase.escapeHTML(spell.name || "(Unnamed Spell)")}</div>
              <div class="array-item-subtitle">${EditorBase.escapeHTML(subtitle)}</div>
            </div>
            <div class="flex gap-2 items-center">
              ${preparedBadge}
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

  function addSpellRow(panelEl) {
    const spell  = Schema.createDefaultSpell();
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
    // Read spell slots
    if (character.dnd || character.boss) {
      const spellSlots = {};
      document.querySelectorAll(".spell-slot-max").forEach(input => {
        const level   = parseInt(input.dataset.level, 10);
        const max     = parseInt(input.value, 10) || 0;
        const current = parseInt(
          document.querySelector(`.spell-slot-current[data-level="${level}"]`)?.value,
          10
        ) || 0;
        if (max > 0 || current > 0) {
          spellSlots[level] = { max, current };
        }
      });
      character.spellSlots = spellSlots;

      const abilityEl = document.getElementById("spellcasting-ability");
      if (abilityEl && character.dnd) {
        character.dnd.spellcastingAbility = abilityEl.value;
      }
    }

    // Read spells
    const spellRows = document.querySelectorAll("#spells-list .spell-row");
    character.spells = Array.from(spellRows).map(rowEl => {
      const id = rowEl.dataset.spellId || Schema.generateId();

      const componentsRaw = rowEl.querySelector(".spell-components")?.value || "";
      const components    = componentsRaw.split(",").map(c => c.trim()).filter(Boolean);

      const tagsRaw = rowEl.querySelector(".spell-tags")?.value || "";
      const tags    = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);

      return {
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
        tags,
      };
    }).filter(spell => spell.name);

    return character;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    buildTab,
    readTab,
  };

})();
