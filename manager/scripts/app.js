/**
 * app.js
 * Main application entry point.
 * Handles: view routing, settings panel, toast notifications,
 * GitHub config persistence, and the global character cache.
 */

const App = (() => {

  const state = {
    currentView:      "list",
    editingCharacter: null,
    loading:          false,
  };

  let mainContentEl    = null;
  let loadingOverlayEl = null;
  let toastContainerEl = null;

  // ─── Init ────────────────────────────────────────────────────────────────────

  function init() {
    mainContentEl    = document.getElementById("main-content");
    loadingOverlayEl = document.getElementById("loading-overlay");
    toastContainerEl = document.getElementById("toast-container");

    setupNavigation();

    if (!GitHub.isConfigured()) {
      navigateTo("settings");
    } else {
      navigateTo("list");
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  function navigateTo(viewName, options = {}) {
    state.currentView = viewName;

    document.querySelectorAll("[data-nav-target]").forEach(item => {
      item.classList.toggle("active", item.dataset.navTarget === viewName);
    });

    mainContentEl.innerHTML = "";

    switch (viewName) {
      case "list":
        CharacterList.render(mainContentEl);
        break;
      case "editor":
        if (options.character) state.editingCharacter = options.character;
        CharacterEditor.render(mainContentEl, state.editingCharacter);
        break;
      case "settings":
        renderSettingsView(mainContentEl);
        break;
      default:
        mainContentEl.innerHTML = `<p class="text-muted">Unknown view: ${viewName}</p>`;
    }
  }

  function setupNavigation() {
    document.querySelectorAll("[data-nav-target]").forEach(item => {
      item.addEventListener("click", () => navigateTo(item.dataset.navTarget));
    });
  }

  // ─── Settings View ────────────────────────────────────────────────────────────

  function renderSettingsView(container) {
    const config = GitHub.getConfig();

    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-header">
          <h2>⚙️ Settings</h2>
          <p class="text-muted">Configure your GitHub repository. Your token is stored only in this browser's localStorage.</p>
        </div>

        <div class="settings-card card">
          <div class="section-header">
            <span class="section-icon">🐙</span>
            <h3>GitHub Repository</h3>
          </div>

          <div class="settings-field">
            <label class="field-label" for="setting-owner">Repository Owner</label>
            <p class="field-hint">Your GitHub username (e.g. Lulukitty22)</p>
            <input type="text" id="setting-owner" class="field-input"
              placeholder="e.g. Lulukitty22" value="${config.owner}" />
          </div>

          <div class="settings-field">
            <label class="field-label" for="setting-repo">Repository Name</label>
            <p class="field-hint">The name of your public repo (e.g. Character_Manager)</p>
            <input type="text" id="setting-repo" class="field-input"
              placeholder="e.g. Character_Manager" value="${config.repo}" />
          </div>

          <div class="settings-field">
            <label class="field-label" for="setting-branch">Branch</label>
            <p class="field-hint">Which branch to use (almost always "main")</p>
            <input type="text" id="setting-branch" class="field-input"
              placeholder="main" value="${config.branch}" />
          </div>

          <div class="settings-field">
            <label class="field-label" for="setting-token">Personal Access Token (PAT)</label>
            <p class="field-hint">
              Create at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">github.com/settings/tokens</a>.
              Choose <strong>Fine-grained token</strong>, set Repository access to your repo,
              and grant <strong>Contents: Read and Write</strong> permission only.
              Stored locally — never sent anywhere except GitHub.
            </p>
            <input type="password" id="setting-token" class="field-input"
              placeholder="github_pat_xxxxxxxxxxxxxxxx"
              value="${config.token}" autocomplete="off" />
          </div>

          <div class="settings-actions">
            <button id="btn-save-settings" class="button button-primary">💾 Save Settings</button>
            <button id="btn-test-connection" class="button button-ghost">🔌 Test Connection</button>
            <span id="connection-status" class="settings-status"></span>
          </div>
        </div>

        <div class="settings-card card" style="margin-top: var(--space-6);">
          <div class="section-header"><span class="section-icon">⚠️</span><h3>Danger Zone</h3></div>
          <p class="text-muted" style="margin-bottom: var(--space-4);">Clear all locally stored settings. Does not touch GitHub.</p>
          <button id="btn-clear-settings" class="button button-danger button-sm">🗑️ Clear All Local Settings</button>
        </div>
      </div>
    `;

    document.getElementById("btn-save-settings").addEventListener("click",   saveSettings);
    document.getElementById("btn-test-connection").addEventListener("click", testConnection);
    document.getElementById("btn-clear-settings").addEventListener("click",  clearSettings);
  }

  function saveSettings() {
    const owner  = document.getElementById("setting-owner").value.trim();
    const repo   = document.getElementById("setting-repo").value.trim();
    const branch = document.getElementById("setting-branch").value.trim() || "main";
    const token  = document.getElementById("setting-token").value.trim();

    if (!owner || !repo || !token) {
      showToast("Owner, repository, and token are all required.", "error");
      return;
    }

    localStorage.setItem("githubOwner",  owner);
    localStorage.setItem("githubRepo",   repo);
    localStorage.setItem("githubBranch", branch);
    localStorage.setItem("githubToken",  token);

    showToast("Settings saved!", "success");
  }

  async function testConnection() {
    const statusEl   = document.getElementById("connection-status");
    statusEl.textContent = "Testing…";
    statusEl.className   = "settings-status";

    saveSettings();

    const result = await GitHub.verifyConfig();

    if (result.ok) {
      statusEl.textContent = "✅ Connected successfully!";
      statusEl.className   = "settings-status text-success";
      showToast("GitHub connection verified!", "success");
    } else {
      statusEl.textContent = `❌ ${result.error}`;
      statusEl.className   = "settings-status text-danger";
      showToast(result.error, "error");
    }
  }

  function clearSettings() {
    if (!confirm("Clear all local settings?")) return;
    ["githubToken", "githubOwner", "githubRepo", "githubBranch"].forEach(key => localStorage.removeItem(key));
    showToast("Settings cleared.", "info");
    renderSettingsView(mainContentEl);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────────

  function showLoading(message = "Loading…") {
    state.loading = true;
    loadingOverlayEl.querySelector(".loading-message").textContent = message;
    loadingOverlayEl.classList.remove("hidden");
  }

  function hideLoading() {
    state.loading = false;
    loadingOverlayEl.classList.add("hidden");
  }

  // ─── Toasts ───────────────────────────────────────────────────────────────────

  function showToast(message, type = "info", durationMs = 3500) {
    const toast       = document.createElement("div");
    toast.className   = `toast toast-${type}`;
    toast.textContent = message;
    toastContainerEl.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity    = "0";
      toast.style.transform  = "translateX(20px)";
      toast.style.transition = "opacity 200ms, transform 200ms";
      setTimeout(() => toast.remove(), 210);
    }, durationMs);
  }

  // ─── Character I/O ────────────────────────────────────────────────────────────

  async function loadCharacterList() {
    showLoading("Loading characters from GitHub…");
    try {
      return await GitHub.listCharacterFiles();
    } catch (error) {
      showToast(`Failed to load characters: ${error.message}`, "error");
      return [];
    } finally {
      hideLoading();
    }
  }

  async function loadCharacter(repoPath) {
    showLoading("Loading character…");
    try {
      return await GitHub.readCharacterFile(repoPath);
    } catch (error) {
      showToast(`Failed to load: ${error.message}`, "error");
      return null;
    } finally {
      hideLoading();
    }
  }

  async function saveCharacter(characterData, sha = null) {
    const repoPath = characterData.meta?.repoPath;
    if (!repoPath) { showToast("Character has no repo path. Cannot save.", "error"); return null; }

    characterData.meta.lastUpdated = new Date().toISOString();

    showLoading("Saving to GitHub…");
    try {
      const result = await GitHub.writeCharacterFile(repoPath, characterData, sha);
      showToast("Character saved!", "success");
      return result.sha;
    } catch (error) {
      showToast(`Save failed: ${error.message}`, "error");
      return null;
    } finally {
      hideLoading();
    }
  }

  return {
    init,
    navigateTo,
    showToast,
    showLoading,
    hideLoading,
    loadCharacterList,
    loadCharacter,
    saveCharacter,
    getState: () => state,
  };

})();

// ─── Character Editor ─────────────────────────────────────────────────────────
// Ties all editor tab modules together into a single tabbed view.

const CharacterEditor = (() => {

  let currentCharacter = null;
  let currentSha       = null;
  let currentFilePath  = null;

  function render(container, characterInfo) {
    if (!characterInfo) {
      container.innerHTML = `<p class="text-muted">No character selected.</p>`;
      return;
    }

    currentCharacter = Schema.applyDefaults(characterInfo.data);
    currentSha       = characterInfo.sha       || null;
    currentFilePath  = characterInfo.filePath  || currentCharacter.meta?.repoPath || "";

    const type  = currentCharacter.type;
    const name  = currentCharacter.identity?.name || "New Character";
    const icon  = Schema.CHARACTER_TYPE_ICONS[type] || "✨";
    const label = Schema.CHARACTER_TYPE_LABELS[type] || type;

    // Build tab definitions based on character type
    const tabs = buildTabDefinitions(currentCharacter);

    // Shell
    container.innerHTML = `
      <div class="editor-view">
        <div class="editor-header">
          <div class="editor-title">
            <span style="font-size: var(--text-2xl);">${icon}</span>
            <div>
              <h2>${escapeHTML(name)}</h2>
              <span class="badge badge-accent">${label}</span>
            </div>
          </div>
          <div class="editor-actions">
            <button id="btn-back-to-list" class="button button-ghost">← Back</button>
            <button id="btn-preview-sheet" class="button button-ghost">👁 Preview</button>
            <button id="btn-export-sheet" class="button button-ghost">📤 Export</button>
            <button id="btn-save-character" class="button button-primary">💾 Save to GitHub</button>
          </div>
        </div>

        <div class="editor-tabs" id="editor-tabs">
          ${tabs.map((tab, index) => `
            <button class="editor-tab ${index === 0 ? "active" : ""}"
              data-tab-index="${index}" data-tab-id="${tab.id}">
              ${tab.icon} ${tab.label}
            </button>
          `).join("")}
        </div>

        <div id="editor-tab-panels"></div>

        <div class="editor-save-bar">
          <span class="editor-save-status" id="save-status"></span>
          <button id="btn-save-bar" class="button button-primary">💾 Save to GitHub</button>
        </div>
      </div>
    `;

    // Render tab panels
    const panelsContainer = container.querySelector("#editor-tab-panels");
    tabs.forEach((tab, index) => {
      const panel = tab.buildFn(currentCharacter);
      if (index !== 0) panel.classList.remove("active");
      panelsContainer.appendChild(panel);
    });

    // Wire tab switching
    container.querySelectorAll(".editor-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        container.querySelectorAll(".editor-tab").forEach(btn => btn.classList.remove("active"));
        container.querySelectorAll(".editor-tab-panel").forEach(panel => panel.classList.remove("active"));

        tabBtn.classList.add("active");
        const index = parseInt(tabBtn.dataset.tabIndex, 10);
        const panels = container.querySelectorAll(".editor-tab-panel");
        if (panels[index]) panels[index].classList.add("active");
      });
    });

    // Wire save buttons
    container.querySelector("#btn-save-character")?.addEventListener("click", saveCurrentCharacter);
    container.querySelector("#btn-save-bar")?.addEventListener("click",       saveCurrentCharacter);
    container.querySelector("#btn-back-to-list")?.addEventListener("click",   () => App.navigateTo("list"));

    container.querySelector("#btn-preview-sheet")?.addEventListener("click", () => {
      const data = collectCharacterData();
      openPreview(data);
    });

    container.querySelector("#btn-export-sheet")?.addEventListener("click", () => {
      const data = collectCharacterData();
      SheetExporter.exportCharacter(data, currentFilePath);
    });
  }

  // ─── Tab Definitions ─────────────────────────────────────────────────────────

  function buildTabDefinitions(character) {
    const type = character.type;
    const tabs = [
      { id: "base",      icon: "🧾", label: "Identity",   buildFn: (char) => EditorBase.buildTab(char)      },
    ];

    if (type === Schema.CHARACTER_TYPES.DND5E_PC) {
      tabs.push({ id: "dnd",       icon: "⚔️",  label: "D&D Stats",  buildFn: (char) => EditorDnd.buildTab(char)       });
    }

    if (type === Schema.CHARACTER_TYPES.DND5E_BOSS) {
      tabs.push({ id: "boss",      icon: "💀",  label: "Boss",       buildFn: (char) => EditorBoss.buildTab(char)      });
    }

    // Spells available to everyone
    tabs.push({ id: "spells",    icon: "✨",  label: "Spells",     buildFn: (char) => EditorSpells.buildTab(char)    });
    tabs.push({ id: "inventory", icon: "🎒",  label: "Inventory",  buildFn: (char) => EditorInventory.buildTab(char) });
    tabs.push({ id: "resources", icon: "🔮",  label: "Resources",  buildFn: (char) => EditorResources.buildTab(char) });

    if (type === Schema.CHARACTER_TYPES.ROBLOX_OC) {
      tabs.push({ id: "roblox", icon: "🎮", label: "Roblox", buildFn: (char) => EditorRoblox.buildTab(char) });
    }

    return tabs;
  }

  // ─── Collect & Save ───────────────────────────────────────────────────────────

  function collectCharacterData() {
    const character = JSON.parse(JSON.stringify(currentCharacter)); // deep copy

    // Read each active editor module
    EditorBase.readTab(character);
    EditorSpells.readTab(character);
    EditorInventory.readTab(character);
    EditorResources.readTab(character);

    if (character.type === Schema.CHARACTER_TYPES.DND5E_PC)   EditorDnd.readTab(character);
    if (character.type === Schema.CHARACTER_TYPES.DND5E_BOSS) EditorBoss.readTab(character);
    if (character.type === Schema.CHARACTER_TYPES.ROBLOX_OC)  EditorRoblox.readTab(character);

    // Update name in header
    const headerH2 = document.querySelector(".editor-title h2");
    if (headerH2) headerH2.textContent = character.identity?.name || "New Character";

    return character;
  }

  async function saveCurrentCharacter() {
    const statusEl = document.getElementById("save-status");
    if (statusEl) statusEl.textContent = "Saving…";

    const data = collectCharacterData();

    // Ensure repoPath
    if (!data.meta.repoPath) {
      data.meta.repoPath = Schema.deriveRepoPath(data.identity?.name || "character");
    }

    currentFilePath = data.meta.repoPath;

    const newSha = await App.saveCharacter(data, currentSha);

    if (newSha) {
      currentSha       = newSha;
      currentCharacter = data;
      if (statusEl) {
        statusEl.textContent = `Saved ${new Date().toLocaleTimeString()}`;
      }
    } else {
      if (statusEl) statusEl.textContent = "Save failed.";
    }
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────

  function openPreview(characterData) {
    let sheetHTML = "";
    const type    = characterData.type;

    if (type === Schema.CHARACTER_TYPES.DND5E_PC)   sheetHTML = ViewDnd5e.buildHTML(characterData);
    else if (type === Schema.CHARACTER_TYPES.DND5E_BOSS) sheetHTML = ViewBoss.buildHTML(characterData);
    else sheetHTML = ViewOc.buildHTML(characterData);

    const overlay = document.createElement("div");
    overlay.className = "sheet-preview-overlay";
    overlay.innerHTML = `
      <div class="sheet-preview-modal">
        <div class="sheet-preview-toolbar flex-between">
          <span class="text-muted text-sm">Sheet Preview</span>
          <button class="button button-ghost button-sm" id="btn-close-editor-preview">✕ Close</button>
        </div>
        <div class="sheet-preview-body">${sheetHTML}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#btn-close-editor-preview").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  }

  function escapeHTML(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { render };

})();

// Boot
document.addEventListener("DOMContentLoaded", () => App.init());
