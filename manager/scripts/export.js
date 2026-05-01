/**
 * export.js
 * Builds a self-contained shareable HTML file for a character.
 *
 * Architecture: the exported file contains NO embedded renderer code and NO
 * embedded character data. Instead it stores a set of raw.githubusercontent.com
 * URLs and, on open, fetches everything it needs:
 *
 *   1. manager/style/base.css   — CSS variables + utilities
 *   2. manager/style/sheet.css  — sheet display styles
 *   3. manager/scripts/schema.js               — shared helpers
 *   4. manager/scripts/views/view-character.js — unified renderer (all types)
 *   5. characters/{name}.json   — the actual character data
 *
 * Why this works:
 *   - raw.githubusercontent.com has open CORS headers (public repos)
 *   - fetch() to an HTTPS URL works from file:// pages in all major browsers
 *   - The file is ~3 KB and always renders the latest data & renderer version
 *
 * Exports: SheetExporter.exportCharacter(characterData, filePath) → void
 */

const SheetExporter = (() => {

  // ─── Public Entry Point ──────────────────────────────────────────────────────

  /**
   * Build and trigger a download of a shareable character sheet HTML file.
   * @param {Object} characterData - The character's data object (used only for the filename + title)
   * @param {string} filePath      - The repo path, e.g. "characters/capella.json"
   */
  function exportCharacter(characterData, filePath) {
    const owner  = localStorage.getItem("githubOwner")  || "";
    const repo   = localStorage.getItem("githubRepo")   || "";
    const branch = localStorage.getItem("githubBranch") || "main";

    if (!owner || !repo) {
      App.showToast("GitHub owner/repo not configured — set them in Settings first.", "error");
      return;
    }

    // Base URL for all files in this repo
    const repoBase    = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

    // URL of the character JSON (what the sheet fetches for its data)
    const characterUrl = `${repoBase}/${filePath}`;

    // URLs of the renderer assets (fetched at sheet-open time)
    const scriptUrls = {
      baseCss:       `${repoBase}/manager/style/base.css`,
      sheetCss:      `${repoBase}/manager/style/sheet.css`,
      schema:        `${repoBase}/manager/scripts/schema.js`,
      viewCharacter: `${repoBase}/manager/scripts/views/view-character.js`,
    };

    const name        = characterData.identity?.name || "Character";
    const safeFile    = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const html        = buildExportHTML(characterUrl, scriptUrls, name);

    downloadHTML(html, `${safeFile}-sheet.html`);
  }

  // ─── HTML Builder ─────────────────────────────────────────────────────────────

  function buildExportHTML(characterUrl, scriptUrls, characterName) {
    const escapedName        = escapeHtmlEntities(characterName);
    const escapedCharacterUrl = escapeJsString(characterUrl);
    const escapedBaseCss      = escapeJsString(scriptUrls.baseCss);
    const escapedSheetCss      = escapeJsString(scriptUrls.sheetCss);
    const escapedSchema        = escapeJsString(scriptUrls.schema);
    const escapedViewCharacter = escapeJsString(scriptUrls.viewCharacter);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedName} — Character Sheet</title>
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
    </div>

    <div id="state-error" class="shell-error" hidden>
      <h2>⚠ Could not load character</h2>
      <p id="error-message">Unknown error.</p>
      <p class="shell-error-hint">Make sure the GitHub repository is public and the file path is correct.</p>
      <p class="shell-error-url"><a id="error-url" href="" target="_blank" rel="noopener noreferrer"></a></p>
    </div>

    <main id="sheet-content" hidden></main>

  </div>

  <script>
/* ── Character Sheet Bootstrap ───────────────────────────────────────────── */
(function () {
  "use strict";

  // ── URLs embedded at export time ──────────────────────────────────────────
  var CHARACTER_URL      = "${escapedCharacterUrl}";
  var BASE_CSS_URL       = "${escapedBaseCss}";
  var SHEET_CSS_URL      = "${escapedSheetCss}";
  var SCHEMA_URL         = "${escapedSchema}";
  var VIEW_CHARACTER_URL = "${escapedViewCharacter}";

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var loadingEl = document.getElementById("state-loading");
  var errorEl   = document.getElementById("state-error");
  var contentEl = document.getElementById("sheet-content");
  var statusEl  = document.getElementById("loading-status");

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function showError(message, url) {
    loadingEl.hidden = true;
    errorEl.hidden   = false;
    var msgEl = document.getElementById("error-message");
    var urlEl = document.getElementById("error-url");
    if (msgEl) msgEl.textContent = message;
    if (urlEl) { urlEl.href = url || ""; urlEl.textContent = url || ""; }
  }

  /** Fetch a URL and return its text, or throw a descriptive error. */
  async function fetchText(url, label) {
    var response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      throw new Error("Network error loading " + label + ": " + networkError.message);
    }
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " loading " + label + " — " + response.statusText);
    }
    return response.text();
  }

  /** Inject a CSS string into the document head. */
  function injectCSS(cssText) {
    var style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  /** Inject a JS string as an inline script (executes synchronously). */
  function injectScript(jsText, label) {
    var script = document.createElement("script");
    script.textContent = jsText;
    try {
      document.head.appendChild(script);
    } catch (error) {
      throw new Error("Error executing " + label + ": " + error.message);
    }
  }

  // ── Main Loader ───────────────────────────────────────────────────────────

  async function main() {
    try {

      // 1. Load CSS (parallel — order handled by separate inject calls)
      setStatus("Loading styles…");
      var [baseCssText, sheetCssText] = await Promise.all([
        fetchText(BASE_CSS_URL,  "base.css"),
        fetchText(SHEET_CSS_URL, "sheet.css"),
      ]);
      injectCSS(baseCssText);
      injectCSS(sheetCssText);

      // 2. Load renderer scripts (schema first, then the unified renderer)
      setStatus("Loading renderer…");
      var schemaText    = await fetchText(SCHEMA_URL,         "schema.js");
      injectScript(schemaText, "schema.js");

      var viewCharText  = await fetchText(VIEW_CHARACTER_URL, "view-character.js");
      injectScript(viewCharText, "view-character.js");

      // 3. Fetch the character data
      setStatus("Loading character data…");
      var characterData = await fetchText(CHARACTER_URL, "character JSON")
        .then(function (text) { return JSON.parse(text); });

      // 4. Render
      setStatus("Rendering…");
      var html = ViewCharacter.buildHTML(characterData);

      // 5. Display
      loadingEl.hidden = true;
      contentEl.hidden = false;
      contentEl.innerHTML = html;

      // Wire interactive elements (boss toggle, etc.)
      ViewCharacter.wireInteractive(contentEl, characterData);

      // Update page title
      var name = characterData.identity && characterData.identity.name;
      if (name) document.title = name + " — Character Sheet";

    } catch (error) {
      showError(error.message || String(error), CHARACTER_URL);
    }
  }

  main();

})();
  </script>
</body>
</html>`;
  }

  // ─── Shell Styles (loading / error states only) ───────────────────────────
  // These are minimal inline styles for the page before base.css + sheet.css load.
  // They only need to cover the loading spinner and error box.

  const SHELL_STYLES = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a090d;
      color: #e8e4f0;
      font-family: 'Inter', system-ui, sans-serif;
      min-height: 100vh;
    }
    #sheet-content {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    @media (max-width: 640px) {
      #sheet-content { padding: 1rem 0.75rem; }
    }
    .shell-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      gap: 1rem;
      color: #8a8299;
      font-size: 0.95rem;
      text-align: center;
    }
    .shell-loading strong { color: #e8e4f0; }
    .shell-loading-sub { font-size: 0.8rem; color: #5a5570; }
    .shell-spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #2e2a3d;
      border-top-color: #9b72cf;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .shell-error {
      max-width: 580px;
      margin: 5rem auto;
      padding: 2.5rem;
      background: #13111a;
      border: 1px solid #b94040;
      border-radius: 12px;
      text-align: center;
    }
    .shell-error h2 { color: #b94040; margin-bottom: 1rem; font-size: 1.2rem; }
    .shell-error p  { color: #8a8299; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .shell-error-url { margin-top: 1.25rem; }
    .shell-error-url a { color: #9b72cf; font-size: 0.75rem; word-break: break-all; }
  `;

  // ─── Escape Helpers ──────────────────────────────────────────────────────────

  /** Escape text for safe use inside HTML content (not attributes). */
  function escapeHtmlEntities(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Escape a string for safe embedding in a JS string literal (quoted with double quotes).
   * Handles backslashes, double quotes, template literal backticks, and newlines.
   */
  function escapeJsString(text) {
    return String(text ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  '\\"')
      .replace(/`/g,  "\\`")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  // ─── File Download Trigger ───────────────────────────────────────────────────

  function downloadHTML(html, filename) {
    const blob   = new Blob([html], { type: "text/html;charset=utf-8" });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href      = url;
    anchor.download  = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    App.showToast(`Exported "${filename}" — open it in any browser.`, "success");
  }

  return { exportCharacter };

})();
