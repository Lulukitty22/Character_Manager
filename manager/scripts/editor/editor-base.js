/**
 * editor-base.js
 * Universal character editor panel — identity, appearance, personality,
 * backstory, notes, aliases, tags. Used by all character types.
 *
 * Exports: EditorBase.buildTab(character) → HTMLElement
 *          EditorBase.readTab(character)  → mutates character in-place
 */

const EditorBase = (() => {

  // ─── Build Tab Panel ────────────────────────────────────────────────────────

  function buildTab(character) {
    const panel = document.createElement("div");
    panel.className = "editor-tab-panel active";
    panel.id        = "tab-panel-base";

    const identity   = character.identity   || {};
    const appearance = character.appearance  || {};

    panel.innerHTML = `
      <div style="padding: var(--space-6) 0; display: flex; flex-direction: column; gap: var(--space-8);">

        <!-- ── Identity ──────────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🧾</span>
            <h3>Identity</h3>
          </div>

          <div class="fields-grid-2">
            <div class="field-group">
              <label class="field-label" for="base-name">Name</label>
              <input type="text" id="base-name" class="field-input"
                placeholder="Character name"
                value="${escapeAttr(identity.name || "")}" />
            </div>
            <div class="field-group">
              <label class="field-label" for="base-race">Race / Species</label>
              <input type="text" id="base-race" class="field-input"
                placeholder="e.g. Human, Tiefling, Reborn…"
                value="${escapeAttr(identity.race || "")}" />
            </div>
          </div>

          <div class="fields-grid-3">
            <div class="field-group">
              <label class="field-label" for="base-age">Age</label>
              <input type="text" id="base-age" class="field-input"
                placeholder="e.g. 22 or ~1000"
                value="${escapeAttr(identity.age || "")}" />
            </div>
            <div class="field-group">
              <label class="field-label" for="base-height">Height</label>
              <input type="text" id="base-height" class="field-input"
                placeholder="e.g. 160cm / 5'3&quot;"
                value="${escapeAttr(identity.height || "")}" />
            </div>
            <div class="field-group">
              <label class="field-label" for="base-origin">Origin / Nation</label>
              <input type="text" id="base-origin" class="field-input"
                placeholder="e.g. Arnica, Lugnica…"
                value="${escapeAttr(identity.origin || "")}" />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Aliases / Other Names</label>
            <p class="field-hint">Press Enter or comma to add. Click ✕ to remove.</p>
            <div class="tags-input-container" id="aliases-container">
              ${(identity.aliases || []).map(alias => renderTagPill(alias, "alias")).join("")}
              <input
                type="text"
                class="tags-input-field"
                id="aliases-input"
                placeholder="Add alias…"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Tags</label>
            <p class="field-hint">Use tags to categorize and filter characters. Press Enter or comma to add.</p>
            <div class="tags-input-container" id="tags-container">
              ${(identity.tags || []).map(tag => renderTagPill(tag, "tag")).join("")}
              <input
                type="text"
                class="tags-input-field"
                id="tags-input"
                placeholder="Add tag…"
              />
            </div>
          </div>
        </section>

        <!-- ── Appearance ─────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🪞</span>
            <h3>Appearance</h3>
          </div>

          <div class="field-group">
            <label class="field-label" for="base-appearance-desc">Description</label>
            <textarea id="base-appearance-desc" class="field-textarea" rows="4"
              placeholder="Physical description, notable features, usual attire…">${escapeHTML(appearance.description || "")}</textarea>
          </div>

          <div class="field-group">
            <label class="field-label">Reference Images</label>
            <p class="field-hint">Paste image URLs (art references, screenshots, etc.).</p>
            <div id="images-list" class="array-list">
              ${(appearance.images || []).map(image => renderImageRow(image)).join("")}
            </div>
            <div class="array-add-row">
              <button class="button button-ghost button-sm" id="btn-add-image">+ Add Image URL</button>
            </div>
          </div>
        </section>

        <!-- ── Personality ─────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">🧠</span>
            <h3>Personality</h3>
          </div>

          <div class="field-group">
            <textarea id="base-personality" class="field-textarea" rows="5"
              placeholder="Traits, mannerisms, fears, motivations…">${escapeHTML(character.personality || "")}</textarea>
          </div>
        </section>

        <!-- ── Backstory ───────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">📖</span>
            <h3>Backstory</h3>
          </div>

          <div class="field-group">
            <textarea id="base-backstory" class="field-textarea" rows="8"
              placeholder="History, origin story, key events…">${escapeHTML(character.backstory || "")}</textarea>
          </div>
        </section>

        <!-- ── Notes ──────────────────────────────────────────────────── -->
        <section>
          <div class="section-header">
            <span class="section-icon">📝</span>
            <h3>Notes</h3>
          </div>

          <div class="field-group">
            <textarea id="base-notes" class="field-textarea" rows="4"
              placeholder="DM notes, session reminders, miscellaneous…">${escapeHTML(character.notes || "")}</textarea>
          </div>
        </section>

      </div>
    `;

    // Wire up tags inputs
    wireTagsInput(panel, "aliases-container", "aliases-input", "alias");
    wireTagsInput(panel, "tags-container",    "tags-input",    "tag");

    // Wire up image add button
    panel.querySelector("#btn-add-image").addEventListener("click", () => {
      addImageRow(panel);
    });

    // Wire up existing image remove buttons
    panel.querySelectorAll(".btn-remove-image").forEach(button => {
      button.addEventListener("click", () => button.closest(".array-item").remove());
    });

    return panel;
  }

  // ─── Read Tab Back Into Character ────────────────────────────────────────────

  function readTab(character) {
    if (!character.identity)   character.identity   = {};
    if (!character.appearance) character.appearance = {};

    // Identity fields
    character.identity.name   = document.getElementById("base-name")?.value.trim()   || "";
    character.identity.race   = document.getElementById("base-race")?.value.trim()   || "";
    character.identity.age    = document.getElementById("base-age")?.value.trim()    || "";
    character.identity.height = document.getElementById("base-height")?.value.trim() || "";
    character.identity.origin = document.getElementById("base-origin")?.value.trim() || "";

    // Tags and aliases from pill containers
    character.identity.aliases = readTagsFromContainer("aliases-container");
    character.identity.tags    = readTagsFromContainer("tags-container");

    // Appearance
    character.appearance.description = document.getElementById("base-appearance-desc")?.value || "";
    character.appearance.images      = readImageRows();

    // Prose fields
    character.personality = document.getElementById("base-personality")?.value || "";
    character.backstory   = document.getElementById("base-backstory")?.value   || "";
    character.notes       = document.getElementById("base-notes")?.value       || "";

    return character;
  }

  // ─── Tags Input Wiring ───────────────────────────────────────────────────────

  function wireTagsInput(panelEl, containerId, inputId, dataType) {
    const container = panelEl.querySelector(`#${containerId}`);
    const input     = panelEl.querySelector(`#${inputId}`);
    if (!container || !input) return;

    // Add tag on Enter or comma
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        const value = input.value.replace(/,/g, "").trim();
        if (value) {
          addTagPill(container, input, value, dataType);
          input.value = "";
        }
      }
      // Remove last tag on Backspace if input is empty
      if (event.key === "Backspace" && input.value === "") {
        const pills = container.querySelectorAll(".tag-pill");
        if (pills.length > 0) pills[pills.length - 1].remove();
      }
    });

    // Click on container focuses input
    container.addEventListener("click", () => input.focus());

    // Wire existing remove buttons
    container.querySelectorAll(".tag-pill-remove").forEach(removeButton => {
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        removeButton.closest(".tag-pill").remove();
      });
    });
  }

  function addTagPill(container, inputEl, value, dataType) {
    const pill = document.createElement("span");
    pill.className        = "tag-pill";
    pill.dataset.type     = dataType;
    pill.dataset.value    = value;
    pill.innerHTML        = `${escapeHTML(value)} <span class="tag-pill-remove" title="Remove">✕</span>`;

    pill.querySelector(".tag-pill-remove").addEventListener("click", (event) => {
      event.stopPropagation();
      pill.remove();
    });

    container.insertBefore(pill, inputEl);
  }

  function readTagsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll(".tag-pill"))
      .map(pill => pill.dataset.value || pill.textContent.replace("✕", "").trim())
      .filter(Boolean);
  }

  function renderTagPill(value, dataType) {
    return `<span class="tag-pill" data-type="${dataType}" data-value="${escapeAttr(value)}">
      ${escapeHTML(value)}
      <span class="tag-pill-remove" title="Remove">✕</span>
    </span>`;
  }

  // ─── Image Row Helpers ───────────────────────────────────────────────────────

  function renderImageRow(imageObj) {
    const id    = imageObj.id    || Schema.generateId();
    const label = imageObj.label || "";
    const url   = imageObj.url   || "";

    return `
      <div class="array-item" data-image-id="${escapeAttr(id)}">
        <div class="array-item-content fields-grid-2">
          <div class="field-group" style="margin-bottom:0">
            <input type="text" class="field-input image-label-input" placeholder="Label (e.g. Default, Bladesong)" value="${escapeAttr(label)}" />
          </div>
          <div class="field-group" style="margin-bottom:0">
            <input type="url" class="field-input image-url-input" placeholder="https://…" value="${escapeAttr(url)}" />
          </div>
        </div>
        <div class="array-item-actions">
          <button class="button button-icon button-ghost btn-remove-image" title="Remove">🗑️</button>
        </div>
      </div>
    `;
  }

  function addImageRow(panelEl) {
    const listEl  = panelEl.querySelector("#images-list");
    const newItem = document.createElement("div");
    newItem.innerHTML = renderImageRow({ id: Schema.generateId(), label: "", url: "" });
    const itemEl  = newItem.firstElementChild;

    itemEl.querySelector(".btn-remove-image").addEventListener("click", () => itemEl.remove());
    listEl.appendChild(itemEl);
    itemEl.querySelector(".image-label-input")?.focus();
  }

  function readImageRows() {
    const listEl = document.getElementById("images-list");
    if (!listEl) return [];

    return Array.from(listEl.querySelectorAll(".array-item")).map(item => ({
      id:    item.dataset.imageId || Schema.generateId(),
      label: item.querySelector(".image-label-input")?.value.trim() || "",
      url:   item.querySelector(".image-url-input")?.value.trim()   || "",
    })).filter(image => image.url);
  }

  // ─── Escape Helpers ──────────────────────────────────────────────────────────

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  return {
    buildTab,
    readTab,
    escapeHTML,
    escapeAttr,
  };

})();
