/**
 * editor-dnd.js
 * D&D 5e player character fields — ability scores, AC modes, saves, skills,
 * speed, initiative, feats, and multiclass entries.
 * The HP tracker lives in editor-resources.js.
 *
 * When character.dnd is absent, the tab shows an Enable call-to-action instead.
 *
 * Exports: EditorDnd.buildTab(character) → HTMLElement
 *          EditorDnd.readTab(character)  → mutates character in-place (skips if section absent)
 */

const EditorDnd = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-dnd";

    function render() {
      panel.innerHTML = "";

      // ── Section not enabled ──────────────────────────────────────────────────
      if (!character.dnd) {
        panel.innerHTML = `
          <div style="padding: var(--space-12, 3rem) var(--space-6); display: flex; flex-direction: column;
                      align-items: center; gap: var(--space-4); text-align: center; min-height: 320px;
                      justify-content: center;">
            <div style="font-size: 3rem; line-height: 1;">⚔️</div>
            <h3 style="color: var(--text-secondary, #8a8299);">D&amp;D Stats</h3>
            <p class="text-muted text-sm" style="max-width: 400px;">
              This character doesn't have D&amp;D 5e stats yet. Enable this section to add class,
              ability scores, AC modes, saving throws, skill proficiencies, feats, and more.
            </p>
            <button class="button button-primary btn-enable-dnd" style="margin-top: var(--space-2);">
              ✦ Enable D&amp;D Stats
            </button>
          </div>
        `;
        panel.querySelector(".btn-enable-dnd").addEventListener("click", () => {
          character.dnd = Schema.createDefaultDnd();
          render();
        });
        return;
      }

      // ── Full editor ──────────────────────────────────────────────────────────
      const dnd = character.dnd;
      dnd.feats = (dnd.feats || []).map(feat => typeof Library !== "undefined" ? Library.resolveRef(feat) : feat);

      panel.innerHTML = `
        <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

          <!-- Remove section -->
          <div style="display: flex; justify-content: flex-end;">
            <button class="button button-ghost button-sm btn-remove-dnd-section"
              style="color: var(--color-danger, #b94040);">
              🗑 Remove D&amp;D Section
            </button>
          </div>

          <!-- ── Class & Level ─────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">⚔️</span>
              <h3>Class &amp; Background</h3>
            </div>

            <div class="fields-grid-4">
              <div class="field-group">
                <label class="field-label" for="dnd-class">Class</label>
                <input type="text" id="dnd-class" class="field-input"
                  placeholder="Wizard" value="${EditorBase.escapeAttr(dnd.class || "")}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="dnd-subclass">Subclass</label>
                <input type="text" id="dnd-subclass" class="field-input"
                  placeholder="Bladesinging" value="${EditorBase.escapeAttr(dnd.subclass || "")}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="dnd-level">Level</label>
                <input type="number" min="1" max="20" id="dnd-level" class="field-input field-number"
                  value="${dnd.level || 1}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="dnd-proficiency">Proficiency Bonus</label>
                <input type="number" min="2" max="9" id="dnd-proficiency" class="field-input field-number"
                  value="${dnd.proficiencyBonus || 2}" />
              </div>
            </div>

            <div class="fields-grid-3">
              <div class="field-group">
                <label class="field-label" for="dnd-background">Background</label>
                <input type="text" id="dnd-background" class="field-input"
                  placeholder="Sage" value="${EditorBase.escapeAttr(dnd.background || "")}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="dnd-alignment">Alignment</label>
                <input type="text" id="dnd-alignment" class="field-input"
                  placeholder="Chaotic Neutral" value="${EditorBase.escapeAttr(dnd.alignment || "")}" />
              </div>
              <div class="field-group">
                <label class="field-label">Spellcasting Ability</label>
                <select id="dnd-spellcasting-ability" class="field-select">
                  ${Object.entries(Schema.ABILITY_NAMES).map(([key, name]) =>
                    `<option value="${key}" ${dnd.spellcastingAbility === key ? "selected" : ""}>${name}</option>`
                  ).join("")}
                </select>
              </div>
            </div>

            <!-- Multiclass entries -->
            <div class="field-group">
              <label class="field-label">Multiclass</label>
              <div id="multiclass-list" class="array-list">
                ${(dnd.multiclass || []).map(entry => renderMulticlassRow(entry)).join("")}
              </div>
              <div class="array-add-row">
                <button class="button button-ghost button-sm" id="btn-add-multiclass">+ Add Class</button>
              </div>
            </div>
          </section>

          <!-- ── Ability Scores ─────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🎲</span>
              <h3>Ability Scores</h3>
            </div>

            <div class="grid-6-stats">
              ${Object.keys(Schema.ABILITY_ABBREVIATIONS).map(ability =>
                renderStatInputGroup(ability, (dnd.stats || {})[ability]?.score ?? 10)
              ).join("")}
            </div>
          </section>

          <!-- ── AC Modes ───────────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🛡️</span>
              <h3>Armor Class</h3>
            </div>
            <p class="text-muted text-sm" style="margin-bottom: var(--space-3);">
              Add multiple AC modes (e.g. Base, Bladesong, Shield). Mark one as active.
            </p>

            <div id="ac-modes-list" class="array-list">
              ${(dnd.acModes || []).map(mode => renderAcModeRow(mode)).join("")}
            </div>
            <div class="array-add-row">
              <button class="button button-ghost button-sm" id="btn-add-ac-mode">+ Add AC Mode</button>
            </div>
          </section>

          <!-- ── Speed & Initiative ──────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">💨</span>
              <h3>Speed &amp; Initiative</h3>
            </div>

            <div class="fields-grid-4">
              <div class="field-group">
                <label class="field-label" for="speed-walk">Walk (ft)</label>
                <input type="number" min="0" id="speed-walk" class="field-input field-number"
                  value="${dnd.speed?.walk ?? 30}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="speed-fly">Fly (ft)</label>
                <input type="number" min="0" id="speed-fly" class="field-input field-number"
                  value="${dnd.speed?.fly ?? 0}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="speed-swim">Swim (ft)</label>
                <input type="number" min="0" id="speed-swim" class="field-input field-number"
                  value="${dnd.speed?.swim ?? 0}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="speed-climb">Climb (ft)</label>
                <input type="number" min="0" id="speed-climb" class="field-input field-number"
                  value="${dnd.speed?.climb ?? 0}" />
              </div>
            </div>
            <div style="max-width: 120px;">
              <div class="field-group">
                <label class="field-label" for="dnd-initiative">Initiative Bonus</label>
                <input type="number" id="dnd-initiative" class="field-input field-number"
                  value="${dnd.initiative ?? 0}" />
              </div>
            </div>
          </section>

          <!-- ── Saving Throw Proficiencies ────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🎯</span>
              <h3>Saving Throws</h3>
            </div>
            <div class="flex flex-wrap gap-4">
              ${Object.entries(Schema.ABILITY_NAMES).map(([key, name]) => `
                <label class="field-checkbox-row">
                  <input type="checkbox" class="save-prof-checkbox" data-ability="${key}"
                    ${(dnd.savingThrowProficiencies || []).includes(key) ? "checked" : ""} />
                  ${Schema.ABILITY_ABBREVIATIONS[key]} — ${name}
                </label>
              `).join("")}
            </div>
          </section>

          <!-- ── Skill Proficiencies ────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">📚</span>
              <h3>Skill Proficiencies</h3>
            </div>
            <div class="skills-grid">
              ${Schema.SKILLS.map(skill => {
                const prof = (dnd.skillProficiencies || []).find(p => p.skill === skill.name);
                const isProficient = !!prof;
                const isExpert     = prof?.expertise || false;
                return `
                  <div class="skill-row">
                    <label class="field-checkbox-row" style="flex: 1; min-width: 0;">
                      <input type="checkbox" class="skill-prof-checkbox"
                        data-skill="${EditorBase.escapeAttr(skill.name)}"
                        data-ability="${skill.ability}"
                        ${isProficient ? "checked" : ""} />
                      <span class="truncate">${skill.name}</span>
                      <span class="text-faint text-xs">(${Schema.ABILITY_ABBREVIATIONS[skill.ability]})</span>
                    </label>
                    <label class="field-checkbox-row text-xs text-muted">
                      <input type="checkbox" class="skill-expert-checkbox"
                        data-skill="${EditorBase.escapeAttr(skill.name)}"
                        ${isExpert ? "checked" : ""}
                        ${!isProficient ? "disabled" : ""} />
                      Expertise
                    </label>
                  </div>
                `;
              }).join("")}
            </div>

            <style>
              .skills-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: var(--space-2);
              }
              .skill-row {
                display:     flex;
                align-items: center;
                gap:         var(--space-3);
              }
            </style>
          </section>

          <!-- ── Feats ──────────────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">⭐</span>
              <h3>Feats</h3>
            </div>

            <div id="feats-list" class="array-list">
              ${(dnd.feats || []).map(feat => renderFeatRow(feat)).join("")}
            </div>
            <div class="array-add-row">
              <button class="button button-ghost button-sm" id="btn-add-feat">+ Add Feat</button>
              <button class="button button-ghost button-sm" id="btn-browse-feats">Browse Library</button>
            </div>
          </section>

        </div>
      `;

      // Wire remove section
      panel.querySelector(".btn-remove-dnd-section").addEventListener("click", () => {
        if (confirm("Remove D&D Stats section? All D&D data for this character will be deleted.")) {
          delete character.dnd;
          render();
        }
      });

      // Wire stat inputs — auto-update modifiers
      panel.querySelectorAll(".stat-input-score").forEach(input => {
        input.addEventListener("input", () => {
          const score    = parseInt(input.value, 10) || 10;
          const modifier = Schema.getAbilityModifier(score);
          const modEl    = input.closest(".stat-input-group")?.querySelector(".stat-input-modifier");
          if (modEl) modEl.textContent = Schema.formatModifier(modifier);
        });
      });

      // Wire skill proficiency ↔ expertise dependency
      panel.querySelectorAll(".skill-prof-checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", () => {
          const skill    = checkbox.dataset.skill;
          const expertEl = panel.querySelector(`.skill-expert-checkbox[data-skill="${skill}"]`);
          if (expertEl) {
            expertEl.disabled = !checkbox.checked;
            if (!checkbox.checked) expertEl.checked = false;
          }
        });
      });

      // Wire multiclass add
      panel.querySelector("#btn-add-multiclass")?.addEventListener("click", () => addMulticlassRow(panel));
      wireMulticlassList(panel);

      // Wire AC mode add
      panel.querySelector("#btn-add-ac-mode")?.addEventListener("click", () => addAcModeRow(panel));
      wireAcModeList(panel);

      // Wire feats add
      panel.querySelector("#btn-add-feat")?.addEventListener("click", () => addFeatRow(panel));
      panel.querySelector("#btn-browse-feats")?.addEventListener("click", () => browseLibraryFeats(panel));
      wireFeatList(panel);
    } // end render()

    render();
    return panel;
  }

  // ─── Stat Input Group ────────────────────────────────────────────────────────

  function renderStatInputGroup(ability, score) {
    const modifier = Schema.getAbilityModifier(score);
    return `
      <div class="stat-input-group">
        <span class="stat-input-label">${Schema.ABILITY_ABBREVIATIONS[ability]}</span>
        <input type="number" min="1" max="30"
          class="stat-input-score field-input"
          data-ability="${ability}"
          value="${score}" />
        <span class="stat-input-modifier">${Schema.formatModifier(modifier)}</span>
      </div>
    `;
  }

  // ─── AC Mode ─────────────────────────────────────────────────────────────────

  function renderAcModeRow(mode) {
    return `
      <div class="array-item ac-mode-row" data-ac-id="${EditorBase.escapeAttr(mode.id)}">
        <div class="array-item-content fields-grid-2" style="align-items: center; margin-bottom: 0;">
          <input type="text" class="field-input ac-mode-label"
            placeholder="Mode label (e.g. Base)"
            value="${EditorBase.escapeAttr(mode.label || "")}" />
          <div class="flex items-center gap-3">
            <input type="number" class="field-input field-number ac-mode-value"
              placeholder="AC" value="${mode.value ?? 10}" style="width: 70px;" />
            <label class="field-checkbox-row">
              <input type="radio" name="ac-active" class="ac-mode-active"
                ${mode.active ? "checked" : ""} />
              Active
            </label>
          </div>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-ac" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireAcModeList(panelEl) {
    panelEl.querySelectorAll(".ac-mode-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-ac")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addAcModeRow(panelEl) {
    const mode   = { id: Schema.generateId(), label: "", value: 10, active: false };
    const listEl = panelEl.querySelector("#ac-modes-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderAcModeRow(mode);
    const rowEl  = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-ac")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".ac-mode-label")?.focus();
  }

  // ─── Multiclass ──────────────────────────────────────────────────────────────

  function renderMulticlassRow(entry) {
    return `
      <div class="array-item multiclass-row">
        <div class="array-item-content fields-grid-3" style="margin-bottom: 0;">
          <input type="text" class="field-input mc-class"
            placeholder="Class" value="${EditorBase.escapeAttr(entry.class || "")}" />
          <input type="text" class="field-input mc-subclass"
            placeholder="Subclass" value="${EditorBase.escapeAttr(entry.subclass || "")}" />
          <input type="number" min="1" max="20" class="field-input field-number mc-level"
            placeholder="Lv." value="${entry.level || 1}" />
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-mc" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireMulticlassList(panelEl) {
    panelEl.querySelectorAll(".multiclass-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-mc")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addMulticlassRow(panelEl) {
    const listEl = panelEl.querySelector("#multiclass-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderMulticlassRow({ class: "", subclass: "", level: 1 });
    const rowEl  = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-mc")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".mc-class")?.focus();
  }

  // ─── Feats ───────────────────────────────────────────────────────────────────

  function renderFeatRow(feat) {
    return `
      <div class="array-item feat-row"
        data-feat-id="${EditorBase.escapeAttr(feat.id || Schema.generateId())}"
        data-source="${EditorBase.escapeAttr(feat.source || "inline")}"
        data-library-source="${EditorBase.escapeAttr(feat.librarySource || "")}"
        data-library-ref="${EditorBase.escapeAttr(feat.libraryRef || "")}">
        <div class="array-item-content">
          <div class="fields-grid-2">
            <input type="text" class="field-input feat-name"
              placeholder="Feat name" value="${EditorBase.escapeAttr(feat.name || "")}" />
            <input type="text" class="field-input feat-description"
              placeholder="Brief description…" value="${EditorBase.escapeAttr(feat.description || "")}" />
          </div>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-feat" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireFeatList(panelEl) {
    panelEl.querySelectorAll(".feat-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-feat")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addFeatRow(panelEl, feat = null) {
    feat = feat || Schema.createDefaultFeat();
    const listEl = panelEl.querySelector("#feats-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderFeatRow(feat);
    const rowEl  = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-feat")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".feat-name")?.focus();
  }

  async function browseLibraryFeats(panelEl) {
    try {
      await Library.loadAll();
      const feats = Library.list("feats");
      if (!feats.length) {
        App.showToast("No shared feats yet. Add one in Library or save an inline feat first.", "info");
        return;
      }
      const choice = prompt(`Choose a feat number:\n${feats.map((feat, index) => `${index + 1}. ${feat.name}`).join("\n")}`);
      const index = parseInt(choice, 10) - 1;
      if (!feats[index]) return;
      addFeatRow(panelEl, Library.resolveRef(Library.createReference("feats", feats[index])));
    } catch (error) {
      App.showToast(`Could not load feat library: ${error.message}`, "error");
    }
  }

  // ─── Read Tab ────────────────────────────────────────────────────────────────

  function readTab(character) {
    if (!character.dnd) return; // Section not enabled — skip
    const dnd = character.dnd;

    dnd.class                = document.getElementById("dnd-class")?.value.trim()    || "";
    dnd.subclass             = document.getElementById("dnd-subclass")?.value.trim() || "";
    dnd.level                = parseInt(document.getElementById("dnd-level")?.value,       10) || 1;
    dnd.proficiencyBonus     = parseInt(document.getElementById("dnd-proficiency")?.value, 10) || 2;
    dnd.background           = document.getElementById("dnd-background")?.value.trim() || "";
    dnd.alignment            = document.getElementById("dnd-alignment")?.value.trim()  || "";
    dnd.spellcastingAbility  = document.getElementById("dnd-spellcasting-ability")?.value || "wis";

    // Ability scores
    dnd.stats = {};
    document.querySelectorAll(".stat-input-score").forEach(input => {
      const ability = input.dataset.ability;
      if (ability) dnd.stats[ability] = { score: parseInt(input.value, 10) || 10 };
    });

    // Speed
    dnd.speed = {
      walk:   parseInt(document.getElementById("speed-walk")?.value,  10) || 30,
      fly:    parseInt(document.getElementById("speed-fly")?.value,   10) || 0,
      swim:   parseInt(document.getElementById("speed-swim")?.value,  10) || 0,
      climb:  parseInt(document.getElementById("speed-climb")?.value, 10) || 0,
      burrow: 0,
    };

    dnd.initiative = parseInt(document.getElementById("dnd-initiative")?.value, 10) || 0;

    // Saving throw proficiencies
    dnd.savingThrowProficiencies = Array.from(
      document.querySelectorAll(".save-prof-checkbox:checked")
    ).map(checkbox => checkbox.dataset.ability);

    // Skill proficiencies — stored by full display name (matches Schema.SKILLS[i].name)
    dnd.skillProficiencies = Array.from(
      document.querySelectorAll(".skill-prof-checkbox:checked")
    ).map(checkbox => ({
      skill:     checkbox.dataset.skill,
      expertise: document.querySelector(`.skill-expert-checkbox[data-skill="${checkbox.dataset.skill}"]`)?.checked || false,
    }));

    // AC modes
    const existingAcModes = new Map((dnd.acModes || []).map(mode => [mode.id, mode]));
    dnd.acModes = Array.from(document.querySelectorAll(".ac-mode-row")).map(rowEl => {
      const id = rowEl.dataset.acId || Schema.generateId();
      const existing = existingAcModes.get(id) || {};
      return {
        ...existing,
        id,
        label:  rowEl.querySelector(".ac-mode-label")?.value.trim() || "",
        value:  parseInt(rowEl.querySelector(".ac-mode-value")?.value, 10) || 10,
        active: rowEl.querySelector(".ac-mode-active")?.checked || false,
      };
    });

    // Multiclass
    dnd.multiclass = Array.from(document.querySelectorAll(".multiclass-row")).map(rowEl => ({
      class:    rowEl.querySelector(".mc-class")?.value.trim()    || "",
      subclass: rowEl.querySelector(".mc-subclass")?.value.trim() || "",
      level:    parseInt(rowEl.querySelector(".mc-level")?.value, 10) || 1,
    })).filter(entry => entry.class);

    // Feats
    dnd.feats = Array.from(document.querySelectorAll(".feat-row")).map(rowEl => {
      const feat = {
        id:          rowEl.dataset.featId || Schema.generateId(),
        name:        rowEl.querySelector(".feat-name")?.value.trim()        || "",
        description: rowEl.querySelector(".feat-description")?.value.trim() || "",
      };

      if (rowEl.dataset.source === "library") {
        const base = Library.find("feats", rowEl.dataset.libraryRef, rowEl.dataset.librarySource) || {};
        return {
          id: feat.id,
          source: "library",
          libraryCollection: "feats",
          librarySource: rowEl.dataset.librarySource || "custom",
          libraryRef: rowEl.dataset.libraryRef,
          overrides: diffAgainstBase(feat, base),
        };
      }

      return feat;
    }).filter(feat => feat.name || feat.libraryRef);

    return character;
  }

  function diffAgainstBase(current, base) {
    const overrides = {};
    Object.keys(current).forEach(key => {
      if (["id", "source", "libraryCollection", "librarySource", "libraryRef"].includes(key)) return;
      if (JSON.stringify(current[key]) !== JSON.stringify(base[key])) overrides[key] = current[key];
    });
    return overrides;
  }

  return { buildTab, readTab };

})();
