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
 * Public: SheetExporter.exportCharacter(characterData, filePath) → void
 * ────────────────────────────────────────────────────────────────────────
 */

const SheetExporter = (() => {

  const EXPORT_BRANCH  = "staging";
  const SCHEMA_VERSION = "2.0";

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
      schemaVersion: SCHEMA_VERSION,
      characterName: name,
    });

    downloadHTML(html, `${safeFile}-sheet.html`);
  }

  // ─── HTML Stub Builder ─────────────────────────────────────────────────

  function buildExportHTML(opts) {
    const escapedName = escapeHtml(opts.characterName);
    const escapedJSON = JSON.stringify(opts.characterData).replace(/</g, "\\u003c");
    const shellUrl    = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${opts.branch}/share/viewer/index.js`;

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
  <script src="${shellUrl}"></script>
</body>
</html>`;
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

  return { exportCharacter };

})();
