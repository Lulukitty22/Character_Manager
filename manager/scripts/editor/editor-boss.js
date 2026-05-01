/**
 * editor-boss.js
 * D&D 5e boss / NPC fields — boss state toggle, dual HP pools, stat bonuses,
 * attacks with damage arrays, polymorph traits, resistances, immunities,
 * weaknesses, legendary actions, regeneration, and death/tamed rules.
 *
 * When character.boss is absent, the tab shows an Enable call-to-action instead.
 *
 * Exports: EditorBoss.buildTab(character) → HTMLElement
 *          EditorBoss.readTab(character)  → mutates character in-place (skips if section absent)
 */

const EditorBoss = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-boss";

    function render() {
      panel.innerHTML = "";

      // ── Section not enabled ──────────────────────────────────────────────────
      if (!character.boss) {
        panel.innerHTML = `
          <div style="padding: var(--space-12, 3rem) var(--space-6); display: flex; flex-direction: column;
                      align-items: center; gap: var(--space-4); text-align: center; min-height: 320px;
                      justify-content: center;">
            <div style="font-size: 3rem; line-height: 1;">💀</div>
            <h3 style="color: var(--text-secondary, #8a8299);">Boss Stats</h3>
            <p class="text-muted text-sm" style="max-width: 400px;">
              This character doesn't have boss data yet. Enable this section to add dual HP pools,
              stat bonuses, attacks, resistances, immunities, polymorph traits, and special rules.
            </p>
            <button class="button button-primary btn-enable-boss" style="margin-top: var(--space-2);">
              ✦ Enable Boss Stats
            </button>
          </div>
        `;
        panel.querySelector(".btn-enable-boss").addEventListener("click", () => {
          character.boss = Schema.createDefaultBoss();
          render();
        });
        return;
      }

      // ── Full editor ──────────────────────────────────────────────────────────
      const boss = character.boss;

      panel.innerHTML = `
        <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

          <!-- Remove section -->
          <div style="display: flex; justify-content: flex-end;">
            <button class="button button-ghost button-sm btn-remove-boss-section"
              style="color: var(--color-danger, #b94040);">
              🗑 Remove Boss Section
            </button>
          </div>

          <!-- ── Boss State Toggle ──────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">💀</span>
              <h3>Boss State</h3>
            </div>

            <div class="card" style="margin-bottom: var(--space-4);">
              <label class="field-checkbox-row" style="font-size: var(--text-base); gap: var(--space-3);">
                <input type="checkbox" id="boss-active" ${boss.bossActive ? "checked" : ""} />
                <span>
                  <strong>Boss Presence Active</strong>
                  <span class="text-muted text-sm" style="display: block;">When active, stat bonuses apply and boss HP is used.</span>
                </span>
              </label>
            </div>

            <div class="fields-grid-2">
              <div class="card">
                <div class="text-muted text-sm uppercase" style="letter-spacing: 0.08em; margin-bottom: var(--space-3);">Boss HP</div>
                <div class="fields-grid-2">
                  <div class="field-group" style="margin-bottom: 0;">
                    <label class="field-label">Max</label>
                    <input type="number" min="0" id="boss-hp-max" class="field-input"
                      value="${boss.bossHp?.max ?? 0}" />
                  </div>
                  <div class="field-group" style="margin-bottom: 0;">
                    <label class="field-label">Current</label>
                    <input type="number" min="0" id="boss-hp-current" class="field-input"
                      value="${boss.bossHp?.current ?? 0}" />
                  </div>
                </div>
              </div>
              <div class="card">
                <div class="text-muted text-sm uppercase" style="letter-spacing: 0.08em; margin-bottom: var(--space-3);">Default / Tamed HP</div>
                <div class="fields-grid-2">
                  <div class="field-group" style="margin-bottom: 0;">
                    <label class="field-label">Max</label>
                    <input type="number" min="0" id="default-hp-max" class="field-input"
                      value="${boss.defaultHp?.max ?? 0}" />
                  </div>
                  <div class="field-group" style="margin-bottom: 0;">
                    <label class="field-label">Current</label>
                    <input type="number" min="0" id="default-hp-current" class="field-input"
                      value="${boss.defaultHp?.current ?? 0}" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Boss Stat Bonuses ──────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">📈</span>
              <h3>Boss Presence Stat Bonuses</h3>
            </div>
            <p class="text-muted text-sm" style="margin-bottom: var(--space-3);">
              These bonuses are added on top of the base stats when Boss Presence is active.
            </p>
            <div class="grid-6-stats">
              ${Object.keys(Schema.ABILITY_ABBREVIATIONS).map(ability => `
                <div class="stat-input-group">
                  <span class="stat-input-label">${Schema.ABILITY_ABBREVIATIONS[ability]}</span>
                  <input type="number" class="field-input stat-input-score boss-stat-bonus"
                    data-ability="${ability}"
                    value="${boss.bossStatBonuses?.[ability] ?? 0}"
                    style="width: 56px; text-align: center; font-size: var(--text-lg);" />
                  <span class="text-muted text-xs">bonus</span>
                </div>
              `).join("")}
            </div>
          </section>

          <!-- ── Combat Stats ───────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">⚔️</span>
              <h3>Combat</h3>
            </div>

            <div class="fields-grid-4">
              <div class="field-group">
                <label class="field-label" for="boss-regen">Regeneration (HP/turn)</label>
                <input type="number" min="0" id="boss-regen" class="field-input field-number"
                  value="${boss.regeneration?.amount ?? 0}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="boss-legendary">Legendary Actions</label>
                <input type="number" min="0" id="boss-legendary" class="field-input field-number"
                  value="${boss.legendaryActions ?? 0}" />
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Regeneration Disabled By (comma-separated)</label>
              <input type="text" id="boss-regen-disabled" class="field-input"
                placeholder="e.g. radiant damage, critical hit"
                value="${EditorBase.escapeAttr((boss.regeneration?.disabledBy || []).join(", "))}" />
            </div>
          </section>

          <!-- ── Resistances / Immunities / Weaknesses ─────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🛡️</span>
              <h3>Damage Defenses</h3>
            </div>

            <div class="fields-grid-3">
              <div class="field-group">
                <label class="field-label">Resistances</label>
                <p class="field-hint">Comma-separated damage types</p>
                <textarea id="boss-resistances" class="field-textarea" rows="3"
                  placeholder="psychic, cold, necrotic…">${EditorBase.escapeHTML((boss.resistances || []).join(", "))}</textarea>
              </div>
              <div class="field-group">
                <label class="field-label">Immunities</label>
                <p class="field-hint">Damage type immunities</p>
                <textarea id="boss-immunities" class="field-textarea" rows="3"
                  placeholder="poison, lightning…">${EditorBase.escapeHTML((boss.immunities || []).join(", "))}</textarea>
              </div>
              <div class="field-group">
                <label class="field-label">Condition Immunities</label>
                <p class="field-hint">Condition immunities</p>
                <textarea id="boss-condition-immunities" class="field-textarea" rows="3"
                  placeholder="charmed, frightened…">${EditorBase.escapeHTML((boss.conditionImmunities || []).join(", "))}</textarea>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Weaknesses</label>
              <div id="weaknesses-list" class="array-list">
                ${(boss.weaknesses || []).map(weakness => renderWeaknessRow(weakness)).join("")}
              </div>
              <div class="array-add-row">
                <button class="button button-ghost button-sm" id="btn-add-weakness">+ Add Weakness</button>
              </div>
            </div>
          </section>

          <!-- ── Attacks ────────────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🗡️</span>
              <h3>Attacks</h3>
            </div>

            <div id="attacks-list" class="array-list">
              ${(boss.attacks || []).map(attack => renderAttackRow(attack)).join("")}
            </div>
            <div class="array-add-row">
              <button class="button button-primary button-sm" id="btn-add-attack">✦ Add Attack</button>
            </div>
          </section>

          <!-- ── Polymorph Traits ───────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">🦋</span>
              <h3>Polymorph / Shape Traits</h3>
            </div>

            <div id="polymorph-list" class="array-list">
              ${(boss.polymorphTraits || []).map(trait => renderPolymorphRow(trait)).join("")}
            </div>
            <div class="array-add-row">
              <button class="button button-ghost button-sm" id="btn-add-polymorph">+ Add Trait</button>
            </div>
          </section>

          <!-- ── Special Rules ──────────────────────────────────────── -->
          <section>
            <div class="section-header">
              <span class="section-icon">📜</span>
              <h3>Special Rules</h3>
            </div>

            <div class="fields-grid-2">
              <div class="field-group">
                <label class="field-label" for="boss-death-rule">Death / Defeat Rule</label>
                <textarea id="boss-death-rule" class="field-textarea" rows="3"
                  placeholder="What happens when HP reaches 0?">${EditorBase.escapeHTML(boss.deathRule || "")}</textarea>
              </div>
              <div class="field-group">
                <label class="field-label" for="boss-tamed-rule">Tamed / Pacified Rule</label>
                <textarea id="boss-tamed-rule" class="field-textarea" rows="3"
                  placeholder="What changes when boss presence is removed?">${EditorBase.escapeHTML(boss.tamedRule || "")}</textarea>
              </div>
            </div>
          </section>

        </div>
      `;

      // Wire remove section
      panel.querySelector(".btn-remove-boss-section").addEventListener("click", () => {
        if (confirm("Remove Boss section? All boss data for this character will be deleted.")) {
          delete character.boss;
          render();
        }
      });

      // Wire buttons
      panel.querySelector("#btn-add-attack")?.addEventListener("click",   () => addAttackRow(panel));
      panel.querySelector("#btn-add-polymorph")?.addEventListener("click", () => addPolymorphRow(panel));
      panel.querySelector("#btn-add-weakness")?.addEventListener("click",  () => addWeaknessRow(panel));

      wireAttackList(panel);
      wirePolymorphList(panel);
      wireWeaknessList(panel);
    } // end render()

    render();
    return panel;
  }

  // ─── Attack Row ──────────────────────────────────────────────────────────────

  function renderAttackRow(attack) {
    const damageStr = (attack.damage || [])
      .map(d => `${d.dice}+${d.bonus} ${d.type}`)
      .join(" + ");

    return `
      <div class="array-item attack-row" data-attack-id="${EditorBase.escapeAttr(attack.id || Schema.generateId())}">
        <div class="array-item-content">
          <div class="flex-between">
            <div>
              <div class="array-item-title">${EditorBase.escapeHTML(attack.name || "(Unnamed Attack)")}</div>
              <div class="array-item-subtitle">
                +${attack.toHitBonus ?? 0} to hit
                ${attack.advantage ? "· Advantage" : ""}
                · ${EditorBase.escapeHTML(attack.reach || "")}
                ${damageStr ? "· " + EditorBase.escapeHTML(damageStr) : ""}
              </div>
            </div>
          </div>

          <div class="expandable-section collapsed attack-detail-form">
            <div style="margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4);">

              <div class="fields-grid-3">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Name</label>
                  <input type="text" class="field-input attack-name"
                    placeholder="Claw / Talon"
                    value="${EditorBase.escapeAttr(attack.name || "")}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">To Hit Bonus</label>
                  <input type="number" class="field-input field-number attack-to-hit"
                    value="${attack.toHitBonus ?? 0}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Reach / Range</label>
                  <input type="text" class="field-input attack-reach"
                    placeholder="5 ft"
                    value="${EditorBase.escapeAttr(attack.reach || "")}" />
                </div>
              </div>

              <div class="fields-grid-2">
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-label">Average Damage</label>
                  <input type="number" min="0" class="field-input field-number attack-avg"
                    value="${attack.avgDamage ?? 0}" />
                </div>
                <div class="field-group" style="margin-bottom:0">
                  <label class="field-checkbox-row" style="margin-top: 1.4em;">
                    <input type="checkbox" class="attack-advantage" ${attack.advantage ? "checked" : ""} />
                    Rolls with Advantage
                  </label>
                </div>
              </div>

              <!-- Damage rolls -->
              <div>
                <label class="field-label" style="margin-bottom: var(--space-2);">Damage Rolls</label>
                <div class="attack-damage-list array-list">
                  ${(attack.damage || []).map(roll => renderDamageRoll(roll)).join("")}
                </div>
                <button class="button button-ghost button-sm btn-add-damage-roll" style="margin-top: var(--space-2);">+ Add Damage Roll</button>
              </div>

              <div class="field-group" style="margin-bottom:0">
                <label class="field-label">On Hit Effect</label>
                <input type="text" class="field-input attack-on-hit"
                  placeholder="DC 20 STR save or grappled…"
                  value="${EditorBase.escapeAttr(attack.onHit || "")}" />
              </div>

              <div class="field-group" style="margin-bottom:0">
                <label class="field-label">Description</label>
                <textarea class="field-textarea attack-description" rows="2"
                  placeholder="Additional notes…">${EditorBase.escapeHTML(attack.description || "")}</textarea>
              </div>

            </div>
          </div>

          <button class="expand-toggle" data-expanded="false">▸ Show details</button>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-danger btn-remove-attack" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function renderDamageRoll(roll) {
    return `
      <div class="array-item damage-roll-row" style="padding: var(--space-2) var(--space-3);">
        <div class="array-item-content flex gap-3 items-center" style="margin-bottom: 0;">
          <input type="text" class="field-input damage-dice"
            placeholder="2d8" style="width: 70px;"
            value="${EditorBase.escapeAttr(roll.dice || "")}" />
          <span class="text-muted">+</span>
          <input type="number" class="field-input field-number damage-bonus"
            value="${roll.bonus ?? 0}" style="width: 60px;" />
          <select class="field-select damage-type" style="flex: 1;">
            ${Schema.DAMAGE_TYPES.map(type =>
              `<option value="${type.toLowerCase()}" ${roll.type === type.toLowerCase() ? "selected" : ""}>${type}</option>`
            ).join("")}
          </select>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-damage-roll" title="Remove">✕</button>
        </div>
      </div>
    `;
  }

  function wireAttackList(panelEl) {
    panelEl.querySelectorAll(".attack-row").forEach(rowEl => wireAttackRow(rowEl));
  }

  function wireAttackRow(rowEl) {
    const toggleBtn  = rowEl.querySelector(".expand-toggle");
    const detailForm = rowEl.querySelector(".attack-detail-form");

    toggleBtn?.addEventListener("click", () => {
      const expanded = toggleBtn.dataset.expanded === "true";
      toggleBtn.dataset.expanded = String(!expanded);
      toggleBtn.textContent      = expanded ? "▸ Show details" : "▾ Hide details";
      detailForm?.classList.toggle("collapsed", expanded);
    });

    rowEl.querySelector(".btn-remove-attack")?.addEventListener("click", () => rowEl.remove());

    rowEl.querySelector(".attack-name")?.addEventListener("input", (event) => {
      const titleEl = rowEl.querySelector(".array-item-title");
      if (titleEl) titleEl.textContent = event.target.value || "(Unnamed Attack)";
    });

    rowEl.querySelector(".btn-add-damage-roll")?.addEventListener("click", () => {
      const listEl = rowEl.querySelector(".attack-damage-list");
      const temp   = document.createElement("div");
      temp.innerHTML = renderDamageRoll(Schema.createDefaultDamageRoll());
      const rollEl = temp.firstElementChild;
      rollEl.querySelector(".btn-remove-damage-roll")?.addEventListener("click", () => rollEl.remove());
      listEl.appendChild(rollEl);
    });

    rowEl.querySelectorAll(".btn-remove-damage-roll").forEach(button => {
      button.addEventListener("click", () => button.closest(".damage-roll-row").remove());
    });
  }

  function addAttackRow(panelEl) {
    const attack = Schema.createDefaultAttack();
    const listEl = panelEl.querySelector("#attacks-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderAttackRow(attack);
    const rowEl  = temp.firstElementChild;

    wireAttackRow(rowEl);

    const toggleBtn  = rowEl.querySelector(".expand-toggle");
    const detailForm = rowEl.querySelector(".attack-detail-form");
    if (toggleBtn && detailForm) {
      toggleBtn.dataset.expanded = "true";
      toggleBtn.textContent      = "▾ Hide details";
      detailForm.classList.remove("collapsed");
    }

    listEl.appendChild(rowEl);
    rowEl.querySelector(".attack-name")?.focus();
  }

  // ─── Polymorph Traits ────────────────────────────────────────────────────────

  function renderPolymorphRow(trait) {
    return `
      <div class="array-item polymorph-row" data-trait-id="${EditorBase.escapeAttr(trait.id || Schema.generateId())}">
        <div class="array-item-content fields-grid-2">
          <input type="text" class="field-input polymorph-name"
            placeholder="Trait name (e.g. Winged Form)"
            value="${EditorBase.escapeAttr(trait.name || "")}" />
          <input type="text" class="field-input polymorph-description"
            placeholder="Effect…"
            value="${EditorBase.escapeAttr(trait.description || "")}" />
        </div>
        <div class="array-item-actions items-center">
          <label class="field-checkbox-row text-xs">
            <input type="checkbox" class="polymorph-active" ${trait.active ? "checked" : ""} />
            Active
          </label>
          <button class="button button-icon button-ghost btn-remove-polymorph" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wirePolymorphList(panelEl) {
    panelEl.querySelectorAll(".polymorph-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-polymorph")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addPolymorphRow(panelEl) {
    const trait  = Schema.createDefaultPolymorphTrait();
    const listEl = panelEl.querySelector("#polymorph-list");
    const temp   = document.createElement("div");
    temp.innerHTML = renderPolymorphRow(trait);
    const rowEl  = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-polymorph")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".polymorph-name")?.focus();
  }

  // ─── Weaknesses ──────────────────────────────────────────────────────────────

  function renderWeaknessRow(weakness) {
    return `
      <div class="array-item weakness-row" data-weakness-id="${EditorBase.escapeAttr(weakness.id || Schema.generateId())}">
        <div class="array-item-content">
          <input type="text" class="field-input weakness-description"
            placeholder="e.g. Radiant damage disables regeneration for 1 round"
            value="${EditorBase.escapeAttr(weakness.description || "")}" />
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-weakness" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireWeaknessList(panelEl) {
    panelEl.querySelectorAll(".weakness-row").forEach(rowEl => {
      rowEl.querySelector(".btn-remove-weakness")?.addEventListener("click", () => rowEl.remove());
    });
  }

  function addWeaknessRow(panelEl) {
    const weakness = { id: Schema.generateId(), description: "" };
    const listEl   = panelEl.querySelector("#weaknesses-list");
    const temp     = document.createElement("div");
    temp.innerHTML = renderWeaknessRow(weakness);
    const rowEl    = temp.firstElementChild;
    rowEl.querySelector(".btn-remove-weakness")?.addEventListener("click", () => rowEl.remove());
    listEl.appendChild(rowEl);
    rowEl.querySelector(".weakness-description")?.focus();
  }

  // ─── Read Tab ────────────────────────────────────────────────────────────────

  function readTab(character) {
    if (!character.boss) return; // Section not enabled — skip
    const boss = character.boss;
    const existingWeaknesses = new Map((boss.weaknesses || []).map(weakness => [weakness.id, weakness]));
    const existingAttacks = new Map((boss.attacks || []).map(attack => [attack.id, attack]));
    const existingPolymorphTraits = new Map((boss.polymorphTraits || []).map(trait => [trait.id, trait]));

    boss.bossActive = document.getElementById("boss-active")?.checked || false;

    boss.bossHp = {
      max:     parseInt(document.getElementById("boss-hp-max")?.value,     10) || 0,
      current: parseInt(document.getElementById("boss-hp-current")?.value, 10) || 0,
    };

    boss.defaultHp = {
      max:     parseInt(document.getElementById("default-hp-max")?.value,     10) || 0,
      current: parseInt(document.getElementById("default-hp-current")?.value, 10) || 0,
    };

    // Boss stat bonuses
    boss.bossStatBonuses = {};
    document.querySelectorAll(".boss-stat-bonus").forEach(input => {
      boss.bossStatBonuses[input.dataset.ability] = parseInt(input.value, 10) || 0;
    });

    boss.regeneration = {
      amount:     parseInt(document.getElementById("boss-regen")?.value, 10) || 0,
      disabledBy: (document.getElementById("boss-regen-disabled")?.value || "")
        .split(",").map(s => s.trim()).filter(Boolean),
    };

    boss.legendaryActions = parseInt(document.getElementById("boss-legendary")?.value, 10) || 0;

    boss.resistances = (document.getElementById("boss-resistances")?.value || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    boss.immunities = (document.getElementById("boss-immunities")?.value || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    boss.conditionImmunities = (document.getElementById("boss-condition-immunities")?.value || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    boss.weaknesses = Array.from(document.querySelectorAll(".weakness-row")).map(rowEl => {
      const id = rowEl.dataset.weaknessId || Schema.generateId();
      return {
        ...(existingWeaknesses.get(id) || {}),
        id,
        description: rowEl.querySelector(".weakness-description")?.value.trim() || "",
      };
    }).filter(weakness => weakness.description);

    boss.attacks = Array.from(document.querySelectorAll(".attack-row")).map(rowEl => {
      const id = rowEl.dataset.attackId || Schema.generateId();
      const existing = existingAttacks.get(id) || {};
      const damage = Array.from(rowEl.querySelectorAll(".damage-roll-row")).map(rollEl => ({
        dice:  rollEl.querySelector(".damage-dice")?.value.trim()             || "1d6",
        bonus: parseInt(rollEl.querySelector(".damage-bonus")?.value, 10)     || 0,
        type:  rollEl.querySelector(".damage-type")?.value                    || "slashing",
      }));

      return {
        ...existing,
        id,
        name:        rowEl.querySelector(".attack-name")?.value.trim()     || "",
        toHitBonus:  parseInt(rowEl.querySelector(".attack-to-hit")?.value, 10) || 0,
        advantage:   rowEl.querySelector(".attack-advantage")?.checked     || false,
        reach:       rowEl.querySelector(".attack-reach")?.value.trim()    || "",
        damage,
        avgDamage:   parseInt(rowEl.querySelector(".attack-avg")?.value, 10) || 0,
        onHit:       rowEl.querySelector(".attack-on-hit")?.value.trim()   || "",
        description: rowEl.querySelector(".attack-description")?.value     || "",
      };
    }).filter(attack => attack.name);

    boss.polymorphTraits = Array.from(document.querySelectorAll(".polymorph-row")).map(rowEl => {
      const id = rowEl.dataset.traitId || Schema.generateId();
      return {
        ...(existingPolymorphTraits.get(id) || {}),
        id,
        name:        rowEl.querySelector(".polymorph-name")?.value.trim()        || "",
        description: rowEl.querySelector(".polymorph-description")?.value.trim() || "",
        active:      rowEl.querySelector(".polymorph-active")?.checked           || false,
      };
    }).filter(trait => trait.name);

    boss.deathRule = document.getElementById("boss-death-rule")?.value || "";
    boss.tamedRule = document.getElementById("boss-tamed-rule")?.value || "";

    return character;
  }

  return { buildTab, readTab };

})();
