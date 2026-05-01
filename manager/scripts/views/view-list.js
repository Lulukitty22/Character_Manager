/**
 * view-list.js
 * Character dashboard — shows all characters loaded from GitHub as cards.
 * Allows creating new characters, opening the editor, exporting sheets,
 * and deleting characters.
 */

const CharacterList = (() => {

  // ─── Render Entry Point ──────────────────────────────────────────────────────

  async function render(container) {
    container.innerHTML = renderShell();

    const listEl       = document.getElementById("character-card-grid");
    const emptyStateEl = document.getElementById("empty-state");
    const searchInput  = document.getElementById("search-input");

    document.getElementById("btn-new-character").addEventListener("click", openNewCharacterDialog);
    document.getElementById("btn-empty-create")?.addEventListener("click", openNewCharacterDialog);
    searchInput.addEventListener("input", () => filterCards(searchInput.value));
    document.getElementById("btn-refresh").addEventListener("click", () => refresh());

    const files = await App.loadCharacterList();

    if (files.length === 0) {
      emptyStateEl.classList.remove("hidden");
      listEl.classList.add("hidden");
      return;
    }

    // Skeleton placeholders
    files.forEach(file => {
      const cardEl = createSkeletonCard(file.path);
      listEl.appendChild(cardEl);
    });

    // Load each character and replace skeleton
    await Promise.all(files.map(async (file) => {
      try {
        const { data, sha } = await GitHub.readCharacterFile(file.path);
        const placeholder   = listEl.querySelector(`[data-file-path="${file.path}"]`);
        if (placeholder) {
          const temp = document.createElement("div");
          temp.innerHTML = renderCharacterCard(data, sha, file.path);
          const newCard = temp.firstElementChild;
          placeholder.replaceWith(newCard);
          wireCardEl(newCard, file.path, sha);
        }
      } catch {
        const placeholder = listEl.querySelector(`[data-file-path="${file.path}"]`);
        if (placeholder) {
          placeholder.innerHTML = `<p class="text-danger text-sm" style="padding: var(--space-3);">⚠ Failed to load ${file.name}</p>`;
        }
      }
    }));
  }

  // ─── Shell HTML ──────────────────────────────────────────────────────────────

  function renderShell() {
    return `
      <div class="list-view">
        <div class="list-header flex-between">
          <div>
            <h2 class="list-title">📜 Characters</h2>
            <p class="text-muted text-sm">All characters stored in your GitHub repository. Search by name, alias, tag, or classification.</p>
          </div>
          <button id="btn-new-character" class="button button-primary">✦ New Character</button>
        </div>

        <div class="list-controls">
          <input id="search-input" type="search" class="search-input" placeholder="Search characters…" />
          <button id="btn-refresh" class="button button-ghost button-sm">🔄 Refresh</button>
        </div>

        <div id="character-card-grid" class="character-card-grid"></div>

        <div id="empty-state" class="empty-state hidden">
          <div class="empty-icon">📭</div>
          <h3>No characters yet</h3>
          <p class="text-muted">Create your first character, or make sure your GitHub repo has a <code>characters/</code> folder.</p>
          <button class="button button-primary mt-4" id="btn-empty-create">✦ Create First Character</button>
        </div>
      </div>

      <dialog id="new-character-dialog" class="modal-dialog">
        <div class="modal-content card-elevated">
          <div class="modal-header flex-between">
            <h3>✦ New Character</h3>
            <button class="button button-icon button-ghost" id="btn-close-new-dialog">✕</button>
          </div>
          <div class="modal-body">
            <div class="settings-field">
              <label class="field-label" for="new-char-name">Character Name</label>
              <input type="text" id="new-char-name" class="field-input" placeholder="e.g. Capella Emerada Lugnica" />
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-create-character" class="button button-primary">Create Character</button>
            <button id="btn-cancel-new" class="button button-ghost">Cancel</button>
          </div>
        </div>
      </dialog>
    `;
  }

  // ─── Card Rendering ──────────────────────────────────────────────────────────

  function createSkeletonCard(filePath) {
    const card = document.createElement("div");
    card.className = "character-card skeleton";
    card.dataset.filePath = filePath;
    card.innerHTML = `
      <div class="skeleton-line skeleton-line-title"></div>
      <div class="skeleton-line skeleton-line-sub"></div>
      <div class="skeleton-line skeleton-line-short"></div>
    `;
    return card;
  }

  function renderCharacterCard(characterData, sha, filePath) {
    const identity  = characterData.identity || {};
    const presentation = Schema.getCharacterPresentation(characterData);
    const name      = identity.name || "(Unnamed)";
    const race      = identity.race || "";
    const tags      = (identity.tags || []).slice(0, 4);
    const sectionSummary = buildSectionSummary(characterData);
    const searchText = [
      name,
      race,
      identity.aliases || [],
      identity.tags || [],
      sectionSummary,
      presentation.label,
    ].flat().join(" ");

    let subtitle = race;
    if (characterData.dnd) {
      const dnd = characterData.dnd;
      const classLevel = [dnd.class, dnd.level ? `Lv.${dnd.level}` : ""].filter(Boolean).join(" ");
      subtitle = [classLevel, race].filter(Boolean).join(" — ");
    } else if (characterData.boss) {
      subtitle = [race, "Boss"].filter(Boolean).join(" — ");
    }

    let hpDisplay = "";
    if (characterData.dnd?.hp) {
      const hp      = characterData.dnd.hp;
      const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
      const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
      hpDisplay = `
        <div class="card-hp">
          <div class="hp-bar-track"><div class="hp-bar-fill ${hpClass}" style="width:${percent}%"></div></div>
          <span class="hp-text">${hp.current} / ${hp.max} HP</span>
        </div>`;
    } else if (characterData.boss) {
      const activeHp = characterData.boss.bossActive ? characterData.boss.bossHp : characterData.boss.defaultHp;
      const hp       = activeHp || { max: 0, current: 0 };
      const percent  = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
      const hpClass  = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
      const bossFlag = characterData.boss.bossActive ? `<span class="badge badge-crimson">Boss Mode</span>` : "";
      hpDisplay = `
        <div class="card-hp">
          <div class="hp-bar-track"><div class="hp-bar-fill ${hpClass}" style="width:${percent}%"></div></div>
          <span class="hp-text">${hp.current} / ${hp.max} HP ${bossFlag}</span>
        </div>`;
    }

    const tagBadges = tags.map(tag => `<span class="badge">${escapeHTML(tag)}</span>`).join("");

    return `
      <div class="character-card" data-file-path="${escapeAttr(filePath)}" data-sha="${escapeAttr(sha || "")}" data-search="${escapeAttr(searchText)}">
        <div class="card-type-badge"><span class="badge badge-accent">${presentation.icon} ${escapeHTML(presentation.label)}</span></div>
        <div class="card-name">${escapeHTML(name)}</div>
        ${sectionSummary ? `<div class="card-subtitle">${escapeHTML(sectionSummary)}</div>` : ""}
        ${subtitle ? `<div class="card-subtitle">${escapeHTML(subtitle)}</div>` : ""}
        ${hpDisplay}
        ${tagBadges ? `<div class="card-tags">${tagBadges}</div>` : ""}
        <div class="card-actions">
          <button class="button button-primary button-sm btn-edit-char">✏️ Edit</button>
          <button class="button button-ghost button-sm btn-view-sheet">👁 View</button>
          <button class="button button-ghost button-sm btn-export-sheet">📤 Export</button>
          <button class="button button-danger button-sm btn-delete-char">🗑️</button>
        </div>
      </div>
    `;
  }

  // ─── Card Button Wiring ──────────────────────────────────────────────────────

  function wireCardEl(cardEl, filePath, sha) {
    cardEl.querySelector(".btn-edit-char")?.addEventListener("click", async () => {
      const result = await App.loadCharacter(filePath);
      if (!result) return;
      App.navigateTo("editor", { character: { data: result.data, sha: result.sha, filePath } });
    });

    cardEl.querySelector(".btn-view-sheet")?.addEventListener("click", async () => {
      const result = await App.loadCharacter(filePath);
      if (!result) return;
      openSheetPreview(result.data, filePath);
    });

    cardEl.querySelector(".btn-export-sheet")?.addEventListener("click", async () => {
      const result = await App.loadCharacter(filePath);
      if (!result) return;
      SheetExporter.exportCharacter(result.data, filePath);
    });

    cardEl.querySelector(".btn-delete-char")?.addEventListener("click", async () => {
      const name = cardEl.querySelector(".card-name")?.textContent || filePath;
      if (!confirm(`Delete "${name}"? This removes the file from GitHub and cannot be undone.`)) return;

      App.showLoading("Deleting…");
      try {
        await GitHub.deleteCharacterFile(filePath, sha);
        App.showToast(`"${name}" deleted.`, "success");
        cardEl.remove();
        checkEmptyState();
      } catch (error) {
        App.showToast(`Delete failed: ${error.message}`, "error");
      } finally {
        App.hideLoading();
      }
    });
  }

  // ─── Sheet Preview ───────────────────────────────────────────────────────────

  async function openSheetPreview(characterData, filePath) {
    if (characterUsesLibrary(characterData) && typeof Library !== "undefined") {
      App.showLoading("Loading shared library...");
      try {
        await Library.loadAll();
      } catch (error) {
        App.showToast(`Could not load shared library: ${error.message}`, "error");
      } finally {
        App.hideLoading();
      }
    }

    const sheetHTML = ViewCharacter.buildHTML(characterData);

    const overlay = document.createElement("div");
    overlay.className = "sheet-preview-overlay";
    overlay.innerHTML = `
      <div class="sheet-preview-modal">
        <div class="sheet-preview-toolbar flex-between">
          <span class="text-muted text-sm">Preview — ${escapeHTML(filePath)}</span>
          <div class="flex gap-2">
            <button class="button button-ghost button-sm" id="btn-export-preview">📤 Export</button>
            <button class="button button-ghost button-sm" id="btn-close-preview">✕ Close</button>
          </div>
        </div>
        <div class="sheet-preview-body">${sheetHTML}</div>
      </div>
    `;

    document.body.appendChild(overlay);
    ViewCharacter.wireInteractive(overlay.querySelector(".sheet-preview-body"), characterData);
    overlay.querySelector("#btn-close-preview").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#btn-export-preview").addEventListener("click", () => {
      SheetExporter.exportCharacter(characterData, filePath);
    });
    overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  }

  // ─── New Character Dialog ────────────────────────────────────────────────────

  function openNewCharacterDialog() {
    const dialog = document.getElementById("new-character-dialog");
    if (!dialog) return;

    document.getElementById("new-char-name").value = "";
    dialog.showModal();

    document.getElementById("btn-close-new-dialog").onclick = () => dialog.close();
    document.getElementById("btn-cancel-new").onclick       = () => dialog.close();

    const createBtn    = document.getElementById("btn-create-character");
    const newCreateBtn = createBtn.cloneNode(true);
    createBtn.replaceWith(newCreateBtn);

    newCreateBtn.addEventListener("click", () => {
      const name = document.getElementById("new-char-name").value.trim();
      if (!name) { App.showToast("Enter a name for the character.", "error"); return; }

      const character = Schema.createCharacter();
      character.identity.name = name;
      character.meta.repoPath = Schema.deriveRepoPath(name);

      dialog.close();
      App.navigateTo("editor", { character: { data: character, sha: null, filePath: character.meta.repoPath } });
    });
  }

  // ─── Filtering ───────────────────────────────────────────────────────────────

  function filterCards(searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    const grid  = document.getElementById("character-card-grid");
    if (!grid) return;

    grid.querySelectorAll(".character-card").forEach(card => {
      const searchable = (card.dataset.search || card.textContent || "").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      card.style.display = matchesSearch ? "" : "none";
    });

    checkEmptyState();
  }

  function checkEmptyState() {
    const grid  = document.getElementById("character-card-grid");
    const empty = document.getElementById("empty-state");
    if (!grid || !empty) return;
    const visible = Array.from(grid.querySelectorAll(".character-card"))
      .filter(card => card.style.display !== "none")
      .length;
    empty.classList.toggle("hidden", visible > 0);
    grid.classList.toggle("hidden",  visible === 0);
  }

  async function refresh() {
    const content = document.getElementById("main-content");
    if (content) await render(content);
  }

  // ─── Escape Helpers ──────────────────────────────────────────────────────────

  function escapeHTML(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escapeAttr(text) {
    return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function buildSectionSummary(characterData) {
    const sections = [];
    if (characterData.dnd) sections.push("D&D");
    if (characterData.boss) sections.push("Boss");
    if (characterData.roblox) sections.push("Roblox");
    if (characterData.spells?.length) sections.push("Spells");
    if (characterData.inventory?.length) sections.push("Inventory");
    if (characterData.customResources?.length) sections.push("Resources");
    if (characterData.abilities?.length) sections.push("Traits");
    return sections.length ? sections.join(" + ") : "";
  }

  function characterUsesLibrary(character) {
    function hasRefs(entries) {
      return Array.isArray(entries) && entries.some(entry => entry?.source === "library");
    }
    return hasRefs(character.spells) ||
      hasRefs(character.inventory) ||
      hasRefs(character.customResources) ||
      hasRefs(character.abilities) ||
      hasRefs(character.dnd?.feats);
  }

  return { render, refresh, openNewCharacterDialog };

})();
