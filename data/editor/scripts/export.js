/**
 * export.js
 * Builds ultra-thin shareable viewer HTML shims.
 *
 * The exported file contains only:
 *   - metadata for repo + character lookup
 *   - a root mount element
 *   - a tiny bootstrap that fetches data/viewer/boot.js from GitHub
 *
 * All UI, loading states, styles, and rendering are loaded from GitHub.
 */

const SheetExporter = (() => {

  const EXPORT_BRANCH = "staging";
  const EXPORT_DIALOG_ID = "sheet-export-dialog";

  function getSchemaVersionString() {
    const version = typeof Schema !== "undefined" ? Schema.SCHEMA_VERSION : null;
    if (!version) return "2.0";
    return `${version.major || 0}.${version.minor || 0}`;
  }

  function exportCharacter(characterData, filePath) {
    const owner = localStorage.getItem("githubOwner") || "";
    const repo = localStorage.getItem("githubRepo") || "";

    if (!owner || !repo) {
      App.showToast("GitHub owner/repo not configured. Set them in Settings first.", "error");
      return;
    }

    const characterId = characterData?.id || "";
    const name = characterData?.identity?.name || "Character";
    const safeFile = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const html = buildViewerExportHtml({
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

  function exportSessionCharacter(characterData, filePath) {
    const owner = localStorage.getItem("githubOwner") || "";
    const repo = localStorage.getItem("githubRepo") || "";

    if (!owner || !repo) {
      App.showToast("GitHub owner/repo not configured. Set them in Settings first.", "error");
      return;
    }

    const characterId = characterData?.id || "";
    const name = characterData?.identity?.name || "Character";
    const safeFile = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const html = buildSessionExportHtml({
      characterId,
      characterPath: filePath,
      owner,
      repo,
      branch: EXPORT_BRANCH,
      schemaVersion: getSchemaVersionString(),
      characterName: name,
    });

    downloadHTML(html, `${safeFile}-session.html`);
  }

  function openExportChooser(characterData, filePath) {
    const dialog = ensureExportDialog();
    const sheetButton = dialog.querySelector("#btn-export-choice-sheet");
    const sessionButton = dialog.querySelector("#btn-export-choice-session");
    const cancelButton = dialog.querySelector("#btn-export-choice-cancel");

    const close = () => dialog.close();

    const handleSheet = () => {
      close();
      exportCharacter(characterData, filePath);
    };

    const handleSession = () => {
      close();
      exportSessionCharacter(characterData, filePath);
    };

    sheetButton.onclick = handleSheet;
    sessionButton.onclick = handleSession;
    cancelButton.onclick = close;

    dialog.showModal();
  }

  function exportEditor(_characterData, _filePath) {
    App.showToast("Per-character editor exports were retired. Use share/Character_Manager_Editor.html instead.", "info");
  }

  function buildViewerExportHtml(opts) {
    const title = `${escapeHtml(opts.characterName)} - Character Card`;
    const bootUrl = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${opts.branch}/data/viewer/boot.js`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="character-id" content="${escapeAttr(opts.characterId)}" />
  <meta name="character-path" content="${escapeAttr(opts.characterPath)}" />
  <meta name="schema-version" content="${escapeAttr(opts.schemaVersion)}" />
  <meta name="github-owner" content="${escapeAttr(opts.owner)}" />
  <meta name="github-repo" content="${escapeAttr(opts.repo)}" />
  <meta name="github-branch" content="${escapeAttr(opts.branch)}" />
</head>
<body>
  <div id="app-root"></div>
  ${buildShellBootstrap(bootUrl)}
</body>
</html>`;
  }

  function buildSessionExportHtml(opts) {
    const title = `${escapeHtml(opts.characterName)} - Session View`;
    const bootUrl = `https://raw.githubusercontent.com/${opts.owner}/${opts.repo}/${opts.branch}/data/session_viewer/boot.js`;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="character-id" content="${escapeAttr(opts.characterId)}" />
  <meta name="character-path" content="${escapeAttr(opts.characterPath)}" />
  <meta name="schema-version" content="${escapeAttr(opts.schemaVersion)}" />
  <meta name="github-owner" content="${escapeAttr(opts.owner)}" />
  <meta name="github-repo" content="${escapeAttr(opts.repo)}" />
  <meta name="github-branch" content="${escapeAttr(opts.branch)}" />
</head>
<body>
  <div id="app-root"></div>
  ${buildShellBootstrap(bootUrl, "session view")}
</body>
</html>`;
  }

  function buildShellBootstrap(shellUrl, label = "viewer") {
    const shellUrlJson = JSON.stringify(shellUrl);
    return `<script>
    (async function () {
      var shellUrl = ${shellUrlJson};
      try {
        var response = await fetch(shellUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status + " loading ${label}");
        var script = document.createElement("script");
        script.textContent = await response.text();
        script.textContent += "\\n//# sourceURL=" + shellUrl;
        document.head.appendChild(script);
      } catch (error) {
        var message = error && error.message ? error.message : String(error);
        alert("Could not load the ${label}.\\n\\n" + message);
        var root = document.getElementById("app-root");
        if (root) root.textContent = "Could not load ${label}: " + message;
      }
    })();
  </script>`;
  }

  function downloadHTML(htmlString, fileName) {
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function ensureExportDialog() {
    let dialog = document.getElementById(EXPORT_DIALOG_ID);
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = EXPORT_DIALOG_ID;
    dialog.className = "modal-dialog";
    dialog.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h3>Export Character</h3>
            <p class="text-muted text-sm">Choose whether this file should be a read-only Character Card or an interactable Session View file.</p>
          </div>
          <button class="button button-icon button-ghost" id="btn-export-choice-cancel-top" aria-label="Close">X</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; flex-direction:column; gap:12px;">
            <button class="button button-primary" id="btn-export-choice-sheet">Read-only Character Card</button>
            <button class="button button-ghost" id="btn-export-choice-session">Session View Card</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="button button-ghost" id="btn-export-choice-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector("#btn-export-choice-cancel-top")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    return dialog;
  }

  return {
    exportCharacter,
    exportSessionCharacter,
    openExportChooser,
    exportEditor,
  };

})();
