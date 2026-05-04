/**
 * export.js
 * ────────────────────────────────────────────────────────────────────────
 * Builds a tiny shareable HTML stub for a character.
 *
 * The exported file contains:
 *   - <meta> tags (character-id, character-path, schema-version,
 *     github-owner, github-repo, github-branch)
 *   - window.__EMBEDDED_CHARACTER__ — the character JSON snapshot at
 *     export time (offline fallback if the latest can't be fetched)
 *   - A <script src="…/share/viewer/index.js"> pointing at the maintained
 *     loader on the configured branch
 *
 * All renderer code, styles, and library loading happens in the shell.
 * Updating share/viewer/index.js or share/viewer/manifest.json
 * automatically updates every previously-exported sheet on next open.
 *
 * Public:
 *   SheetExporter.exportCharacter(characterData, filePath) → void
 *   SheetExporter.exportEditor(characterData, filePath)    → void
 * ────────────────────────────────────────────────────────────────────────
 */

const SheetExporter = (() => {

  const EXPORT_BRANCH = "staging";

  function getSchemaVersionString() {
    const version = typeof Schema !== "undefined" ? Schema.SCHEMA_VERSION : null;
    if (!version) return "2.0";
    return `${version.major || 0}.${version.minor || 0}`;
  }

  function exportCharacter(characterData, filePath) {
    const owner = localStorage.getItem("githubOwner") || "";
    const repo  = localStorage.getItem("githubRepo")  || "";

    if (!owner || !repo) {
      App.showToast("GitHub owner/repo not configured — set them in Settings first.", "error");
      return;
    }

    const characterId = characterData?.id || "";
    const name        = characterData?.identity?.name || "Character";
    const safeFile    = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const html        = buildExportHTML({
      characterData,
      characterId,
      characterPath: filePath,
      owner,
      repo,
      branch: EXPORT_BRANCH,
      schemaVersion: getSchemaVersionString(),
      characterName: name,
    });

    downloadHTML(html, `${safeFile}-sheet.html`);
  }

  /**
   * Build and download a tiny shareable EDITOR HTML stub.
   * Same cascade pattern as the viewer; loads share/editor/index.js, which
   * mounts the live editor + preview and supports PAT-based save to GitHub.
   * @param {Object} characterData
   * @param {string} filePath - e.g. "characters/capella.json"
   */
  function exportEditor(characterData, filePath) {
    const owner = localStorage.getItem("githubOwner") || "";
    const repo  = localStorage.getItem("githubRepo")  || "";

    if (!owner || !repo) {
      App.showToast("GitHub owner/repo not configured — set them in Settings first.", "error");
      return;
    }

    const characterId = characterData?.id || "";
    const name        = characterData?.identity?.name || "Character";
    const safeFile    = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const html        = buildEditorExportHTML({
      characterData,
      characterId,
      characterPath: filePath,
      owner,
      repo,
      branch: EXPORT_BRANCH,
      schemaVersion: getSchemaVersionString(),
      characterName: name,
    });

    downloadHTML(html, `${safeFile}-editor.html`);
  }

  // ─── HTML Stub Builder ─────────────────────────────────────────────────

  function buildExportHTML(opts) {
    const escapedName = escapeHtml(opts.characterName);
    const escapedJSON = JSON.stringify(opts.characterData).replace(/</g, "\\u003c");
    const shellUrl       = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${opts.branch}/share/viewer/index.js`;
    const shellBootstrap = buildShellBootstrap(shellUrl);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedName} — Character Sheet</title>

  <meta name="character-id"    content="${escapeAttr(opts.characterId)}" />
  <meta name="character-path"  content="${escapeAttr(opts.characterPath)}" />
  <meta name="schema-version"  content="${escapeAttr(opts.schemaVersion)}" />
  <meta name="github-owner"    content="${escapeAttr(opts.owner)}" />
  <meta name="github-repo"     content="${escapeAttr(opts.repo)}" />
  <meta name="github-branch"   content="${escapeAttr(opts.branch)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${SHELL_STYLES}</style>
</head>
<body>
  <div id="sheet-app">
    <div id="state-loading" class="shell-loading">
      <div class="shell-spinner"></div>
      <p>Loading <strong>${escapedName}</strong>…</p>
      <p class="shell-loading-sub" id="loading-status">Fetching renderer…</p>
      <div class="shell-progress" aria-hidden="true">
        <div class="shell-progress-fill" id="loading-progress-fill"></div>
      </div>
      <p class="shell-loading-detail" id="loading-detail"></p>
    </div>

    <div id="state-error" class="shell-error" hidden>
      <h2>⚠ Could not load character</h2>
      <p id="error-message">Unknown error.</p>
      <p class="shell-error-hint">Make sure the GitHub repository is public and reachable.</p>
      <p class="shell-error-url"><a id="error-url" href="" target="_blank" rel="noopener noreferrer"></a></p>
    </div>

    <div id="state-fatal" class="shell-fatal" hidden>
      <h2>⚠ This character file is out of date</h2>
      <p id="fatal-reason">The behind-the-scenes setup that runs this file has changed since it was created, and it can no longer auto-update.</p>
      <p class="shell-fatal-hint">Please ask <strong id="fatal-discord">#VRLulu</strong> on Discord for an updated file.</p>
    </div>

    <main id="sheet-content" hidden></main>
  </div>

  <script>
    window.__EMBEDDED_CHARACTER__ = ${escapedJSON};
  </script>
  ${shellBootstrap}
</body>
</html>`;
  }

  function buildEditorExportHTML(opts) {
    const escapedName = escapeHtml(opts.characterName);
    const escapedJSON = JSON.stringify(opts.characterData).replace(/</g, "\\u003c");
    const shellUrl       = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${opts.branch}/share/editor/index.js`;
    const shellBootstrap = buildShellBootstrap(shellUrl);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedName} — Editor</title>

  <meta name="character-id"    content="${escapeAttr(opts.characterId)}" />
  <meta name="character-path"  content="${escapeAttr(opts.characterPath)}" />
  <meta name="schema-version"  content="${escapeAttr(opts.schemaVersion)}" />
  <meta name="github-owner"    content="${escapeAttr(opts.owner)}" />
  <meta name="github-repo"     content="${escapeAttr(opts.repo)}" />
  <meta name="github-branch"   content="${escapeAttr(opts.branch)}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>${SHELL_STYLES}${EDITOR_SHELL_STYLES}</style>
</head>
<body>
  <div id="sheet-app">
    <div id="editor-loading" class="shell-loading">
      <div class="shell-spinner"></div>
      <p>Loading editor for <strong>${escapedName}</strong>…</p>
      <p class="shell-loading-sub" id="loading-status">Fetching editor shell…</p>
      <div class="shell-progress" aria-hidden="true">
        <div class="shell-progress-fill" id="loading-progress-fill"></div>
      </div>
      <p class="shell-loading-detail" id="loading-detail"></p>
    </div>

    <div id="editor-error" class="shell-error" hidden>
      <h2>⚠ Could not load editor</h2>
      <p id="error-message">Unknown error.</p>
      <p class="shell-error-hint">Make sure the GitHub repository is public and reachable.</p>
      <p class="shell-error-url"><a id="error-url" href="" target="_blank" rel="noopener noreferrer"></a></p>
    </div>

    <div id="editor-fatal" class="shell-fatal" hidden>
      <h2>⚠ This character file is out of date</h2>
      <p id="fatal-reason">The behind-the-scenes setup that runs this file has changed since it was created, and it can no longer auto-update.</p>
      <p class="shell-fatal-hint">Please ask <strong id="fatal-discord">#VRLulu</strong> on Discord for an updated file.</p>
    </div>

    <div id="editor-root" hidden></div>
  </div>

  <script>
    window.__EMBEDDED_CHARACTER__ = ${escapedJSON};
  </script>
  ${shellBootstrap}
</body>
</html>`;
  }

  function buildShellBootstrap(shellUrl) {
    const shellUrlJson = JSON.stringify(shellUrl);
    return `<script>
    (async function () {
      const shellUrl = ${shellUrlJson};
      const statusEl = document.getElementById("loading-status");
      const detailEl = document.getElementById("loading-detail");
      const progressEl = document.getElementById("loading-progress-fill");
      const loadingEl = document.getElementById("state-loading");
      const errorEl = document.getElementById("state-error");
      const messageEl = document.getElementById("error-message");
      const urlEl = document.getElementById("error-url");

      function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
      }

      function setProgress(value, detail) {
        if (progressEl) progressEl.style.width = Math.max(0, Math.min(100, Math.round(value * 100))) + "%";
        if (detailEl) detailEl.textContent = detail || "";
      }

      function showError(message) {
        if (loadingEl) loadingEl.hidden = true;
        if (errorEl) errorEl.hidden = false;
        if (messageEl) messageEl.textContent = message;
        if (urlEl) {
          urlEl.href = shellUrl;
          urlEl.textContent = shellUrl;
        }
      }

      try {
        setStatus("Fetching viewer shell...");
        setProgress(0.02, shellUrl);
        const response = await fetch(shellUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status + " loading viewer shell");

        setStatus("Starting viewer shell...");
        setProgress(0.05, "Viewer shell downloaded.");
        const script = document.createElement("script");
        script.textContent = await response.text();
        script.textContent += "\\n//# sourceURL=" + shellUrl;
        document.head.appendChild(script);
      } catch (error) {
        showError(error && error.message ? error.message : String(error));
      }
    })();
  </script>`;
  }

  // ─── Shell loading/error/fatal styles (inline so they show pre-fetch) ───

  const SHELL_STYLES = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a090d;
      color: #e8e4f0;
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
    }
    #sheet-content {
      max-width: 1040px;
      margin: 0 auto;
    }
    .shell-loading {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 70vh; gap: 1rem;
      color: #8a8299; font-size: 0.95rem; text-align: center;
    }
    .shell-loading strong { color: #e8e4f0; }
    .shell-loading-sub { font-size: 0.8rem; color: #5a5570; }
    .shell-loading-detail {
      max-width: 620px;
      min-height: 1.2em;
      font-size: 0.74rem;
      color: #716a84;
      line-height: 1.4;
      word-break: break-word;
    }
    .shell-progress {
      width: min(520px, 78vw);
      height: 10px;
      overflow: hidden;
      border: 1px solid rgba(201, 168, 76, 0.35);
      border-radius: 999px;
      background: rgba(12, 10, 18, 0.82);
      box-shadow: 0 0 18px rgba(201, 168, 76, 0.12);
    }
    .shell-progress-fill {
      width: 0;
      height: 100%;
      background: linear-gradient(90deg, #8f6f24, #d9bd66, #f2df9a);
      transition: width 160ms ease;
    }
    .shell-spinner {
      width: 44px; height: 44px;
      border: 3px solid #2e2a3d;
      border-top-color: #c9a84c;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .shell-error, .shell-fatal {
      max-width: 580px; margin: 5rem auto; padding: 2.5rem;
      background: #13111a;
      border-radius: 12px;
      text-align: center;
    }
    .shell-error  { border: 1px solid #b94040; }
    .shell-fatal  { border: 1px solid #c9a84c; }
    .shell-error h2 { color: #b94040; margin-bottom: 1rem; font-size: 1.2rem; }
    .shell-fatal h2 { color: #e0c070; margin-bottom: 1rem; font-size: 1.2rem; }
    .shell-error p, .shell-fatal p { color: #b8b0c4; font-size: 0.875rem; margin-bottom: 0.5rem; line-height: 1.55; }
    .shell-fatal-hint { margin-top: 1.5rem; }
    .shell-fatal-hint strong { color: #c9a84c; font-weight: 600; }
    .shell-error-url { margin-top: 1.25rem; }
    .shell-error-url a { color: #9b72cf; font-size: 0.75rem; word-break: break-all; }
  `;

  // ─── Editor chrome styles (used by share/editor/index.js render) ────────
  // These cover the toolbar / edit-pane / preview-pane / PAT drawer layout.
  // The shell injects core/style/* + editor/style/* on top of these for the
  // inner editor and viewer rendering.

  const EDITOR_SHELL_STYLES = `
    #editor-root { min-height: 100vh; display: flex; flex-direction: column; }
    .se-toolbar {
      display: flex; align-items: center; gap: 1rem;
      padding: 0.75rem 1.25rem;
      background: linear-gradient(180deg, rgba(13,11,22,0.95), rgba(13,11,22,0.85));
      backdrop-filter: blur(14px) saturate(140%);
      border-bottom: 1px solid rgba(180,140,255,0.10);
      position: sticky; top: 0; z-index: 50;
    }
    .se-toolbar .se-title { display: flex; flex-direction: column; gap: 2px; }
    .se-toolbar .se-label { font-size: 10px; color: #8a8399; letter-spacing: 0.12em; text-transform: uppercase; }
    .se-toolbar .se-name { font-family: 'Cinzel', serif; font-size: 18px; font-weight: 700; color: #e8c970; letter-spacing: 0.04em; }
    .se-toolbar .se-status { margin-left: auto; font-size: 12px; color: #8a8399; }
    .se-toolbar .se-status[data-state="dirty"] { color: #d9a866; }
    .se-btn {
      background: #221733; border: 1px solid rgba(180,140,255,0.10);
      color: #cfc6dd; padding: 0.5rem 1rem;
      border-radius: 8px; cursor: pointer; font-size: 12px;
      letter-spacing: 0.06em; font-family: inherit;
      transition: all .15s;
    }
    .se-btn:hover { border-color: rgba(180,140,255,0.22); background: #1a1228; color: #f0eaf8; }
    .se-btn-primary {
      background: linear-gradient(180deg, #e8c970, #c9a84c);
      color: #06040b; border-color: #c9a84c; font-weight: 700;
    }
    .se-btn-primary:hover { filter: brightness(1.1); }
    .se-btn-warn { background: rgba(217,168,102,0.10); border-color: rgba(217,168,102,0.40); color: #d9a866; }

    .se-main {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 1.25rem; padding: 1.25rem;
      max-width: 1700px; margin: 0 auto; width: 100%;
      flex: 1; align-items: start;
    }
    @media (max-width: 980px) { .se-main { grid-template-columns: 1fr; } }
    .se-edit-pane { min-width: 0; }
    .se-preview-pane {
      position: sticky; top: 80px;
      border: 1px solid rgba(180,140,255,0.10);
      border-radius: 14px; background: #130d1f;
      max-height: calc(100vh - 100px); overflow-y: auto;
    }
    .se-preview-header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(180,140,255,0.10);
      background: #0d0816;
      font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8399;
    }
    .se-live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #6dc28a; box-shadow: 0 0 6px #6dc28a;
      animation: se-pulse 2s infinite;
    }
    @keyframes se-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .se-preview-body { padding: 1rem; }

    .se-pat-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 420px; max-width: 100vw;
      background: #130d1f;
      border-left: 1px solid rgba(180,140,255,0.22);
      padding: 1.25rem;
      overflow-y: auto;
      box-shadow: -8px 0 32px rgba(0,0,0,0.6);
      z-index: 200;
    }
    .se-pat-drawer h3 {
      font-family: 'Cinzel', serif; font-size: 18px; color: #e8c970;
      margin: 0 0 0.5rem; letter-spacing: 0.06em;
    }
    .se-close {
      float: right; background: transparent; border: 0;
      color: #8a8399; font-size: 20px; cursor: pointer; line-height: 1;
    }
    .se-pat-drawer p { font-size: 13px; color: #cfc6dd; margin: 0 0 0.75rem; }
    .se-pat-drawer code { background: #06040b; padding: 1px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #e8c970; }
    .se-pat-drawer label { display: block; font-size: 11px; color: #8a8399; letter-spacing: 0.10em; text-transform: uppercase; margin: 0.75rem 0 0.25rem; }
    .se-pat-drawer input[type="password"] {
      width: 100%; background: #0d0816; border: 1px solid rgba(180,140,255,0.10);
      border-radius: 8px; padding: 0.5rem 0.75rem;
      color: #f0eaf8; font-family: 'JetBrains Mono', monospace; font-size: 13px;
    }
    .se-pat-status {
      display: flex; gap: 0.5rem; align-items: center;
      padding: 0.75rem; margin: 0.75rem 0;
      background: #221733; border: 1px solid rgba(180,140,255,0.10);
      border-radius: 8px; font-size: 12px;
    }
    .se-pat-status-label { color: #8a8399; letter-spacing: 0.10em; text-transform: uppercase; font-size: 10px; }
    .se-pat-status-value { color: #f0eaf8; }
    .se-pat-actions { display: flex; gap: 0.5rem; margin: 0.75rem 0; flex-wrap: wrap; }
    .se-pat-help { font-size: 11px; color: #6b6478; line-height: 1.5; }

    .se-error-inline {
      padding: 1rem; margin: 1rem;
      border: 1px solid #b94040; border-radius: 8px;
      background: rgba(185,64,64,0.08); color: #d96060;
      font-size: 13px; text-align: center;
    }
  `;

  // ─── Escape Helpers ────────────────────────────────────────────────────

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  // ─── File Download Trigger ─────────────────────────────────────────────

  function downloadHTML(html, filename) {
    const blob   = new Blob([html], { type: "text/html;charset=utf-8" });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href     = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    App.showToast(`Exported "${filename}" — open it in any browser.`, "success");
  }

  return { exportCharacter, exportEditor };

})();
