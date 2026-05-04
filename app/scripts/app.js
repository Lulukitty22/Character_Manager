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
      case "library":
        ViewLibrary.render(mainContentEl);
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
            <p class="field-hint">Use "staging" while testing the new core/share/editor migration. Switch back to "main" only after staging is merged.</p>
            <input type="text" id="setting-branch" class="field-input"
              placeholder="staging" value="${config.branch}" />
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
    const branch = document.getElementById("setting-branch").value.trim() || "staging";
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
    ensureLoadingProgress();
    updateLoading(message, "", 0);
    loadingOverlayEl.classList.remove("hidden");
  }

  function hideLoading() {
    state.loading = false;
    loadingOverlayEl.classList.add("hidden");
  }

  function updateLoading(message, detail = "", progress = null) {
    if (!loadingOverlayEl) return;
    ensureLoadingProgress();
    const messageEl = loadingOverlayEl.querySelector(".loading-message");
    const detailEl = loadingOverlayEl.querySelector(".loading-detail");
    const fillEl = loadingOverlayEl.querySelector(".loading-progress-fill");
    if (messageEl && message) messageEl.textContent = message;
    if (detailEl) detailEl.textContent = detail || "";
    if (fillEl && typeof progress === "number") {
      fillEl.style.width = `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%`;
    }
  }

  function ensureLoadingProgress() {
    if (!loadingOverlayEl || loadingOverlayEl.querySelector(".loading-progress")) return;
    const progressEl = document.createElement("div");
    progressEl.className = "loading-progress";
    progressEl.innerHTML = `<div class="loading-progress-fill"></div>`;
    const detailEl = document.createElement("p");
    detailEl.className = "loading-detail";
    loadingOverlayEl.appendChild(progressEl);
    loadingOverlayEl.appendChild(detailEl);
  }

  window.addEventListener("library-progress", (event) => {
    if (!state.loading || !event.detail) return;
    updateLoading(event.detail.message || "Loading shared library...", event.detail.path || "", event.detail.progress);
    if (event.detail.phase === "complete" && event.detail.errors?.length) {
      showToast(`Library loaded with ${event.detail.errors.length} issue${event.detail.errors.length === 1 ? "" : "s"}. Check console/details if something looks missing.`, "info", 6000);
      console.warn("Library loaded with issues:", event.detail.errors);
    }
  });

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

  async function saveCharacter(characterData, sha = null, previousRepoPath = null) {
    const repoPath = characterData.meta?.repoPath;
    if (!repoPath) { showToast("Character has no repo path. Cannot save.", "error"); return null; }

    const renameFrom = previousRepoPath && previousRepoPath !== repoPath && sha ? previousRepoPath : null;
    characterData.meta.lastUpdated = new Date().toISOString();

    showLoading("Saving to GitHub…");
    try {
      const result = await GitHub.writeCharacterFile(repoPath, characterData, renameFrom ? null : sha);

      if (renameFrom) {
        try {
          await GitHub.deleteCharacterFile(renameFrom, sha);
          showToast("Character renamed and saved!", "success");
        } catch (cleanupError) {
          showToast(`Saved, but could not remove old file ${renameFrom}: ${cleanupError.message}`, "info");
        }
      } else {
        showToast("Character saved!", "success");
      }

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
    updateLoading,
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
  let editorHandle     = null;

  async function render(container, characterInfo) {
    if (!characterInfo) {
      container.innerHTML = `<p class="text-muted">No character selected.</p>`;
      return;
    }

    currentCharacter = Schema.applyDefaults(characterInfo.data);
    currentSha       = characterInfo.sha       || null;
    currentFilePath  = characterInfo.filePath  || currentCharacter.meta?.repoPath || "";

    if (typeof Library !== "undefined" && GitHub.isConfigured()) {
      App.showLoading("Loading shared library...");
      try {
        await Library.loadAll();
      } catch (error) {
        App.showToast(`Shared library could not load yet: ${error.message}`, "info");
      } finally {
        App.hideLoading();
      }
    }

    const name = currentCharacter.identity?.name || "New Character";
    const presentation = Schema.getCharacterPresentation(currentCharacter);
    const icon = presentation.icon;
    const label = presentation.label;

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
            <button id="btn-export-editor" class="button button-ghost">✏️ Export Editor</button>
            <button id="btn-save-character" class="button button-primary">💾 Save to GitHub</button>
          </div>
        </div>

        <div id="editor-mount-root"></div>

        <div class="editor-save-bar">
          <span class="editor-save-status" id="save-status"></span>
          <button id="btn-save-bar" class="button button-primary">💾 Save to GitHub</button>
        </div>
      </div>
    `;

    editorHandle?.destroy?.();
    editorHandle = Editor.mount(container.querySelector("#editor-mount-root"), currentCharacter, {
      onChange: (latest) => {
        currentCharacter = latest;
        updateEditorHeader(latest);
      },
    });

    // Wire save buttons
    container.querySelector("#btn-save-character")?.addEventListener("click", saveCurrentCharacter);
    container.querySelector("#btn-save-bar")?.addEventListener("click",       saveCurrentCharacter);
    container.querySelector("#btn-back-to-list")?.addEventListener("click",   () => App.navigateTo("list"));

    container.querySelector("#btn-preview-sheet")?.addEventListener("click", () => {
      const data = getCurrentEditorData();
      openPreview(data);
    });

    container.querySelector("#btn-export-sheet")?.addEventListener("click", () => {
      const data = getCurrentEditorData();
      SheetExporter.exportCharacter(data, currentFilePath);
    });

    container.querySelector("#btn-export-editor")?.addEventListener("click", () => {
      const data = getCurrentEditorData();
      SheetExporter.exportEditor(data, currentFilePath);
    });
  }

  // ─── Collect & Save ───────────────────────────────────────────────────────────

  function getCurrentEditorData() {
    const character = editorHandle?.getCurrentCharacter
      ? editorHandle.getCurrentCharacter()
      : JSON.parse(JSON.stringify(currentCharacter));
    updateEditorHeader(character);
    return character;
  }

  function updateEditorHeader(character) {
    const headerH2 = document.querySelector(".editor-title h2");
    if (headerH2) headerH2.textContent = character.identity?.name || "New Character";
  }

  async function saveCurrentCharacter() {
    const statusEl = document.getElementById("save-status");
    if (statusEl) statusEl.textContent = "Saving…";

    const data = getCurrentEditorData();
    const characterName = data.identity?.name?.trim() || "";

    if (!characterName) {
      if (statusEl) statusEl.textContent = "Name required.";
      App.showToast("Character name is required before saving.", "error");
      return;
    }

    const previousRepoPath = currentFilePath || currentCharacter?.meta?.repoPath || "";
    data.meta.repoPath = Schema.deriveRepoPath(characterName);

    if (typeof Library !== "undefined") {
      try {
        await Library.syncCharacter(data);
      } catch (error) {
        App.showToast(`Library sync failed: ${error.message}`, "error");
        if (statusEl) statusEl.textContent = "Library sync failed.";
        return;
      }
    }

    const newSha = await App.saveCharacter(data, currentSha, previousRepoPath);

    if (newSha) {
      currentSha       = newSha;
      currentCharacter = data;
      currentFilePath  = data.meta.repoPath;
      if (statusEl) {
        statusEl.textContent = `Saved ${new Date().toLocaleTimeString()}`;
      }
    } else {
      if (statusEl) statusEl.textContent = "Save failed.";
    }
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────

  function openPreview(characterData) {
    const overlay = document.createElement("div");
    overlay.className = "sheet-preview-overlay";
    overlay.innerHTML = `
      <div class="sheet-preview-modal">
        <div class="sheet-preview-toolbar flex-between">
          <span class="text-muted text-sm">Sheet Preview</span>
          <button class="button button-ghost button-sm" id="btn-close-editor-preview">✕ Close</button>
        </div>
        <div class="sheet-preview-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    ViewCharacter.mount(overlay.querySelector(".sheet-preview-body"), characterData);

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
