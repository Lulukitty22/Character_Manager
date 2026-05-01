/**
 * editor-resources.js
 * Custom resource pools with logs — available to all character types.
 * Covers things like Elfnein's "Spell Memories", HP pools, sorcery points, etc.
 * Also handles the D&D HP tracker separately as a special named resource.
 *
 * Exports: EditorResources.buildTab(character) → HTMLElement
 *          EditorResources.readTab(character)  → mutates character in-place
 */

const EditorResources = (() => {

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel";
    panel.id        = "tab-panel-resources";

    const customResources = (character.customResources || []).map(resource => typeof Library !== "undefined" ? Library.resolveRef(resource) : resource);
    const isDnd           = character.dnd != null;
    const hp              = character.dnd?.hp || null;

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── D&D HP Tracker ─────────────────────────────────────── -->
        ${isDnd && hp ? renderHpSection(hp) : ""}

        <!-- ── Custom Resource Pools ─────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🔮</span>
            <h3>Custom Resources</h3>
          </div>
          <p class="text-muted text-sm" style="margin-bottom: var(--space-4);">
            Track any named resource — Spell Memories, Sorcery Points, Ki, Inspiration, etc.
            Each pool has a current value, a max, and an optional change log.
          </p>

          <div id="resources-list">
            ${customResources.map(resource => renderResourcePool(resource)).join("")}
          </div>

          <div class="array-add-row">
            <button class="button button-primary button-sm" id="btn-add-resource">✦ Add Resource Pool</button>
            <button class="button button-ghost button-sm" id="btn-browse-resources">Browse Templates</button>
          </div>
        </section>

      </div>
    `;

    panel.querySelector("#btn-add-resource")?.addEventListener("click", () => {
      addResourcePool(panel);
    });
    panel.querySelector("#btn-browse-resources")?.addEventListener("click", () => browseResourceTemplates(panel));

    wireResourceList(panel);

    // Wire HP section
    if (isDnd && hp) {
      wireHpSection(panel, character);
    }

    return panel;
  }

  // ─── HP Section ──────────────────────────────────────────────────────────────

  function renderHpSection(hp) {
    const percent  = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass  = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
    const logRows  = (hp.log || []).slice().reverse().map(entry => renderLogEntry(entry)).join("");

    return `
      <section>
        <div class="section-header">
          <span class="section-icon">❤️</span>
          <h3>Hit Points</h3>
        </div>

        <div class="hp-display card" style="margin-bottom: var(--space-4);">
          <div class="hp-numbers flex-between" style="margin-bottom: var(--space-3);">
            <div>
              <span style="font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; color: var(--color-text-bright);" id="hp-current-display">${hp.current}</span>
              <span style="color: var(--color-text-muted); font-size: var(--text-xl);">/ </span>
              <span style="font-family: var(--font-display); font-size: var(--text-xl); color: var(--color-text-muted);" id="hp-max-display">${hp.max}</span>
              <span style="font-family: var(--font-ui); font-size: var(--text-sm); color: var(--color-text-muted); margin-left: var(--space-2);">HP</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted text-sm">Temp:</span>
              <input type="number" id="hp-temp" class="field-input field-number"
                value="${hp.temp || 0}" min="0" style="width: 64px;" />
            </div>
          </div>

          <div class="hp-bar-track" style="margin-bottom: var(--space-4);">
            <div id="hp-bar-fill" class="hp-bar-fill ${hpClass}" style="width: ${percent}%"></div>
          </div>

          <div class="fields-grid-2" style="margin-bottom: var(--space-4);">
            <div class="field-group" style="margin-bottom: 0;">
              <label class="field-label" for="hp-max-input">Max HP</label>
              <input type="number" min="0" id="hp-max-input" class="field-input"
                value="${hp.max}" />
            </div>
            <div class="field-group" style="margin-bottom: 0;">
              <label class="field-label" for="hp-current-input">Current HP</label>
              <input type="number" min="0" id="hp-current-input" class="field-input"
                value="${hp.current}" />
            </div>
          </div>

          <!-- Quick adjust buttons -->
          <div class="hp-quick-adjust flex gap-2 flex-wrap" style="margin-bottom: var(--space-4);">
            <input type="number" id="hp-adjust-amount" class="field-input field-number"
              placeholder="Δ" style="width: 70px;" />
            <input type="text" id="hp-adjust-reason" class="field-input flex-1"
              placeholder="Reason (e.g. Fireball damage)…" />
            <button class="button button-danger button-sm" id="btn-hp-damage">− Damage</button>
            <button class="button button-primary button-sm" id="btn-hp-heal">+ Heal</button>
          </div>
        </div>

        <!-- HP Log -->
        <div class="section-header" style="margin-top: 0;">
          <span class="section-icon">📋</span>
          <h3>HP Log</h3>
        </div>
        <div id="hp-log-entries" class="log-entries">
          ${logRows || `<p class="text-faint text-sm" style="padding: var(--space-2);">No entries yet.</p>`}
        </div>
      </section>
    `;
  }

  function wireHpSection(panelEl, character) {
    const maxInput     = panelEl.querySelector("#hp-max-input");
    const currentInput = panelEl.querySelector("#hp-current-input");
    const barFill      = panelEl.querySelector("#hp-bar-fill");
    const currentDisplay = panelEl.querySelector("#hp-current-display");
    const maxDisplay   = panelEl.querySelector("#hp-max-display");

    function updateBar() {
      const max     = parseInt(maxInput?.value,     10) || 0;
      const current = parseInt(currentInput?.value, 10) || 0;
      const percent = max > 0 ? Math.round((current / max) * 100) : 0;

      if (barFill) {
        barFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        barFill.className   = "hp-bar-fill" +
          (percent >= 60 ? "" : percent >= 30 ? " medium" : " low");
      }

      if (currentDisplay) currentDisplay.textContent = current;
      if (maxDisplay)     maxDisplay.textContent     = max;
    }

    maxInput?.addEventListener("input",     updateBar);
    currentInput?.addEventListener("input", updateBar);

    panelEl.querySelector("#btn-hp-damage")?.addEventListener("click", () => {
      applyHpAdjust(panelEl, character, "damage");
    });

    panelEl.querySelector("#btn-hp-heal")?.addEventListener("click", () => {
      applyHpAdjust(panelEl, character, "heal");
    });
  }

  function applyHpAdjust(panelEl, character, mode) {
    const amount       = parseInt(panelEl.querySelector("#hp-adjust-amount")?.value, 10);
    const reason       = panelEl.querySelector("#hp-adjust-reason")?.value.trim() || "";
    const currentInput = panelEl.querySelector("#hp-current-input");
    const logEl        = panelEl.querySelector("#hp-log-entries");

    if (!amount || isNaN(amount) || amount <= 0) {
      App.showToast("Enter an amount greater than 0.", "error");
      return;
    }

    const delta   = mode === "damage" ? -amount : amount;
    const current = parseInt(currentInput?.value, 10) || 0;
    const max     = parseInt(panelEl.querySelector("#hp-max-input")?.value, 10) || 0;
    const newHP   = Math.max(0, Math.min(max, current + delta));

    if (currentInput) currentInput.value = newHP;
    currentInput?.dispatchEvent(new Event("input"));

    // Add log entry
    const entry = Schema.createDefaultHpLogEntry(delta, reason);
    if (!character.dnd) character.dnd = Schema.createDefaultDnd();
    if (!character.dnd.hp.log) character.dnd.hp.log = [];
    character.dnd.hp.log.push(entry);

    // Prepend to log display
    if (logEl) {
      const emptyMsg = logEl.querySelector("p");
      if (emptyMsg) emptyMsg.remove();

      const entryEl = document.createElement("div");
      entryEl.innerHTML = renderLogEntry(entry);
      logEl.insertBefore(entryEl.firstElementChild, logEl.firstChild);
    }

    panelEl.querySelector("#hp-adjust-amount").value = "";
    panelEl.querySelector("#hp-adjust-reason").value = "";
  }

  // ─── Custom Resource Pool ────────────────────────────────────────────────────

  function renderResourcePool(resource) {
    const logRows = (resource.log || []).slice().reverse().map(entry => renderLogEntry(entry)).join("");

    return `
      <div class="resource-pool"
        data-resource-id="${EditorBase.escapeAttr(resource.id)}"
        data-source="${EditorBase.escapeAttr(resource.source || "inline")}"
        data-library-source="${EditorBase.escapeAttr(resource.librarySource || "")}"
        data-library-ref="${EditorBase.escapeAttr(resource.libraryRef || "")}">
        <div class="resource-pool-header">
          <input type="text" class="field-input resource-name"
            placeholder="Resource name (e.g. Spell Memories)"
            value="${EditorBase.escapeAttr(resource.name || "")}"
            style="flex: 1; background: transparent; border: none; font-family: var(--font-display); font-size: var(--text-md); font-weight: 600; color: var(--color-text-bright); padding: 0;" />
          ${resource.source === "library" ? `<span class="badge badge-accent">Library</span>` : ""}
          <button class="button button-icon button-danger btn-remove-resource" title="Remove pool">🗑️</button>
        </div>

        <div class="flex items-center gap-4" style="margin-bottom: var(--space-4);">
          <div class="resource-counter">
            <input type="number" min="0" class="field-input field-number resource-current"
              value="${resource.current ?? 0}" style="width: 72px; font-family: var(--font-display); font-size: var(--text-xl);" />
            <span class="resource-counter-sep">/</span>
            <input type="number" min="0" class="field-input field-number resource-max"
              value="${resource.max ?? 0}" style="width: 72px; color: var(--color-text-muted);" />
          </div>
        </div>

        <!-- Quick adjust -->
        <div class="flex gap-2 flex-wrap" style="margin-bottom: var(--space-4);">
          <input type="number" class="field-input field-number resource-adjust-amount"
            placeholder="Δ" style="width: 70px;" />
          <input type="text" class="field-input flex-1 resource-adjust-reason"
            placeholder="Reason…" />
          <button class="button button-danger button-sm btn-resource-decrease">− Use</button>
          <button class="button button-primary button-sm btn-resource-increase">+ Restore</button>
        </div>

        <!-- Log -->
        <div class="expand-toggle-row">
          <button class="expand-toggle resource-log-toggle" data-expanded="false">▸ Show log</button>
        </div>
        <div class="expandable-section collapsed resource-log-section">
          <div class="log-entries resource-log-entries">
            ${logRows || `<p class="text-faint text-sm" style="padding: var(--space-2);">No entries yet.</p>`}
          </div>
        </div>
      </div>
    `;
  }

  function wireResourceList(panelEl) {
    panelEl.querySelectorAll(".resource-pool").forEach(poolEl => wireResourcePool(poolEl));
  }

  function wireResourcePool(poolEl) {
    poolEl.querySelector(".btn-remove-resource")?.addEventListener("click", () => poolEl.remove());

    const toggleBtn  = poolEl.querySelector(".resource-log-toggle");
    const logSection = poolEl.querySelector(".resource-log-section");

    toggleBtn?.addEventListener("click", () => {
      const expanded = toggleBtn.dataset.expanded === "true";
      toggleBtn.dataset.expanded = String(!expanded);
      toggleBtn.textContent      = expanded ? "▸ Show log" : "▾ Hide log";
      logSection?.classList.toggle("collapsed", expanded);
    });

    poolEl.querySelector(".btn-resource-decrease")?.addEventListener("click", () => {
      adjustResource(poolEl, "decrease");
    });

    poolEl.querySelector(".btn-resource-increase")?.addEventListener("click", () => {
      adjustResource(poolEl, "increase");
    });
  }

  function adjustResource(poolEl, mode) {
    const amount  = parseInt(poolEl.querySelector(".resource-adjust-amount")?.value, 10);
    const reason  = poolEl.querySelector(".resource-adjust-reason")?.value.trim() || "";
    const current = parseInt(poolEl.querySelector(".resource-current")?.value,      10) || 0;
    const max     = parseInt(poolEl.querySelector(".resource-max")?.value,          10) || 0;
    const logEl   = poolEl.querySelector(".resource-log-entries");

    if (!amount || isNaN(amount) || amount <= 0) {
      App.showToast("Enter an amount greater than 0.", "error");
      return;
    }

    const delta  = mode === "decrease" ? -amount : amount;
    const newVal = Math.max(0, Math.min(max || Infinity, current + delta));

    const currentInput = poolEl.querySelector(".resource-current");
    if (currentInput) currentInput.value = newVal;

    const entry = Schema.createDefaultResourceLogEntry(delta, reason);

    if (logEl) {
      const emptyMsg = logEl.querySelector("p");
      if (emptyMsg) emptyMsg.remove();

      const entryEl = document.createElement("div");
      entryEl.innerHTML = renderLogEntry(entry);
      logEl.insertBefore(entryEl.firstElementChild, logEl.firstChild);
    }

    poolEl.querySelector(".resource-adjust-amount").value = "";
    poolEl.querySelector(".resource-adjust-reason").value = "";
  }

  function addResourcePool(panelEl, resource = null) {
    resource = resource || Schema.createDefaultCustomResource();
    const listEl   = panelEl.querySelector("#resources-list");
    const temp     = document.createElement("div");
    temp.innerHTML = renderResourcePool(resource);
    const poolEl   = temp.firstElementChild;

    wireResourcePool(poolEl);
    listEl.appendChild(poolEl);
    poolEl.querySelector(".resource-name")?.focus();
  }

  async function browseResourceTemplates(panelEl) {
    try {
      await Library.loadAll();
      const resources = Library.list("resources");
      if (!resources.length) {
        App.showToast("No resource templates yet. Save an inline resource or add one in Library.", "info");
        return;
      }
      const choice = prompt(`Choose a resource template:\n${resources.map((resource, index) => `${index + 1}. ${resource.name}`).join("\n")}`);
      const index = parseInt(choice, 10) - 1;
      if (!resources[index]) return;
      addResourcePool(panelEl, Library.resolveRef(Library.createReference("resources", resources[index], {
        current: resources[index].max || 0,
        max: resources[index].max || 0,
        log: [],
      })));
    } catch (error) {
      App.showToast(`Could not load resource library: ${error.message}`, "error");
    }
  }

  // ─── Log Entry Rendering ─────────────────────────────────────────────────────

  function renderLogEntry(entry) {
    const delta      = entry.delta || 0;
    const deltaClass = delta >= 0 ? "positive" : "negative";
    const deltaText  = delta >= 0 ? `+${delta}` : String(delta);

    return `
      <div class="log-entry">
        <span class="log-entry-delta ${deltaClass}">${EditorBase.escapeHTML(deltaText)}</span>
        <span class="log-entry-reason">${EditorBase.escapeHTML(entry.reason || "—")}</span>
        <span class="log-entry-date">${EditorBase.escapeHTML(entry.date || "")}</span>
      </div>
    `;
  }

  // ─── Read Tab ────────────────────────────────────────────────────────────────

  function readTab(character) {
    // D&D HP
    if (character.dnd) {
      if (!character.dnd.hp) character.dnd.hp = { max: 0, current: 0, temp: 0, log: [] };
      const maxEl     = document.getElementById("hp-max-input");
      const currentEl = document.getElementById("hp-current-input");
      const tempEl    = document.getElementById("hp-temp");

      if (maxEl)     character.dnd.hp.max     = parseInt(maxEl.value,     10) || 0;
      if (currentEl) character.dnd.hp.current = parseInt(currentEl.value, 10) || 0;
      if (tempEl)    character.dnd.hp.temp    = parseInt(tempEl.value,    10) || 0;
      // Log was updated in-place by applyHpAdjust, no need to re-read it
    }

    // Custom resources
    const poolEls = document.querySelectorAll("#resources-list .resource-pool");
    character.customResources = Array.from(poolEls).map(poolEl => {
      const id = poolEl.dataset.resourceId || Schema.generateId();

      // Collect log entries from DOM
      const logEntries = Array.from(poolEl.querySelectorAll(".log-entry")).map(entryEl => ({
        id:     Schema.generateId(),
        date:   entryEl.querySelector(".log-entry-date")?.textContent.trim()    || "",
        delta:  parseInt(entryEl.querySelector(".log-entry-delta")?.textContent, 10) || 0,
        reason: entryEl.querySelector(".log-entry-reason")?.textContent.trim()  || "",
      })).reverse(); // stored oldest-first

      const resource = {
        id,
        name:    poolEl.querySelector(".resource-name")?.value.trim()          || "",
        max:     parseInt(poolEl.querySelector(".resource-max")?.value,     10) || 0,
        current: parseInt(poolEl.querySelector(".resource-current")?.value, 10) || 0,
        log:     logEntries,
      };

      if (poolEl.dataset.source === "library") {
        const base = Library.find("resources", poolEl.dataset.libraryRef, poolEl.dataset.librarySource) || {};
        return {
          id,
          source: "library",
          libraryCollection: "resources",
          librarySource: poolEl.dataset.librarySource || "custom",
          libraryRef: poolEl.dataset.libraryRef,
          current: resource.current,
          max: resource.max,
          log: resource.log,
          overrides: diffAgainstBase(resource, base, ["current", "max", "log"]),
        };
      }

      return resource;
    }).filter(resource => resource.name || resource.libraryRef);

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
