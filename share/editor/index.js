/**
 * share/editor/index.js
 * ────────────────────────────────────────────────────────────────────────
 * Maintained auto-updating SHARABLE editor shell.
 *
 * Mirrors share/viewer/index.js cascade pattern:
 *   1. Reads <meta> tags + window.__EMBEDDED_CHARACTER__
 *   2. Fetches share/editor/manifest.json (declares scripts/styles/library)
 *   3. Schema-version handshake → fatal overlay on mismatch
 *   4. Loads styles + scripts in order
 *   5. Tries latest character JSON (fall back to embedded snapshot)
 *   6. Seeds library
 *   7. Renders editor chrome (left edit pane + right live preview)
 *   8. Mounts Editor.mount() into edit pane; updates ViewCharacter.mount()
 *      preview on change
 *   9. Save button commits via GitHub.* using a PAT from localStorage;
 *      first-run shows a PAT drawer
 *
 * Differences from the viewer shell:
 *   - Loads editor/scripts/* in addition to core/scripts/*
 *   - Renders an edit-pane + live-preview-pane layout
 *   - PAT drawer for GitHub authentication (commits attributed per-friend)
 *   - Save flow writes back to characters/{id}.json via GitHub Contents API
 * ────────────────────────────────────────────────────────────────────────
 */

(async function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const loadingEl = $("editor-loading");
  const errorEl   = $("editor-error");
  const fatalEl   = $("editor-fatal");
  const rootEl    = $("editor-root");
  const statusEl  = $("loading-status");

  ensureHiddenAttributeWins();

  function ensureHiddenAttributeWins() {
    if (document.getElementById("shell-hidden-override")) return;
    const tag = document.createElement("style");
    tag.id = "shell-hidden-override";
    tag.textContent = "[hidden] { display: none !important; }";
    document.head.appendChild(tag);
  }

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function showError(message, url) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
    const m = $("error-message"); const u = $("error-url");
    if (m) m.textContent = message;
    if (u) { u.href = url || ""; u.textContent = url || ""; }
  }

  function showFatal(reason, contactDiscord) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (fatalEl) {
      fatalEl.hidden = false;
      const r = $("fatal-reason"); const d = $("fatal-discord");
      if (r) r.textContent = reason;
      if (d) d.textContent = contactDiscord || "#VRLulu";
    }
  }

  // ── Read host stub configuration ────────────────────────────────────
  function readMeta(name, fallback) {
    const el = document.querySelector(`meta[name="${name}"]`);
    return (el && el.getAttribute("content")) || fallback || "";
  }

  const cfg = {
    characterId:    readMeta("character-id"),
    characterPath:  readMeta("character-path"),
    schemaVersion:  readMeta("schema-version"),
    owner:          readMeta("github-owner"),
    repo:           readMeta("github-repo"),
    branch:         readMeta("github-branch", "staging"),
  };

  if (!cfg.owner || !cfg.repo) {
    showError("Exported file is missing GitHub owner/repo metadata.", "");
    return;
  }

  const repoBase = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}`;
  const embedded = (typeof window !== "undefined" && window.__EMBEDDED_CHARACTER__) || null;

  // ── Helpers ─────────────────────────────────────────────────────────
  async function fetchText(url, label) {
    let res;
    try { res = await fetch(url, { cache: "no-store" }); }
    catch (err) { const e = new Error(`Network error loading ${label}: ${err.message}`); e.url = url; throw e; }
    if (!res.ok) { const e = new Error(`HTTP ${res.status} loading ${label}`); e.url = url; e.status = res.status; throw e; }
    return res.text();
  }

  function injectStyle(cssText) {
    const tag = document.createElement("style");
    tag.textContent = cssText;
    document.head.appendChild(tag);
  }

  function injectScript(jsText, label) {
    const tag = document.createElement("script");
    tag.textContent = jsText + `\n//# sourceURL=${label}`;
    document.head.appendChild(tag);
  }

  function asUrl(relPath, basePath) {
    if (/^https?:/.test(relPath)) return relPath;
    const base = basePath ? `${repoBase}/${basePath.replace(/\/?$/, "/")}` : `${repoBase}/`;
    return base + relPath.replace(/^\//, "");
  }

  function compareSchemaMajor(embeddedVersion, minCompatible) {
    if (!embeddedVersion) return true;
    const major = parseInt(String(embeddedVersion).split(".")[0], 10);
    return Number.isFinite(major) && major >= minCompatible;
  }

  // ── PAT storage ──────────────────────────────────────────────────────
  const PAT_KEY = `share-editor-pat:${cfg.owner}/${cfg.repo}`;
  function getStoredPat() { try { return localStorage.getItem(PAT_KEY) || ""; } catch { return ""; } }
  function setStoredPat(token) { try { token ? localStorage.setItem(PAT_KEY, token) : localStorage.removeItem(PAT_KEY); } catch {} }

  // ── Main loader ──────────────────────────────────────────────────────
  let manifest = null;
  let characterData = null;

  try {
    setStatus("Fetching editor manifest…");
    manifest = JSON.parse(await fetchText(`${repoBase}/share/editor/manifest.json`, "editor manifest"));

    if (!compareSchemaMajor(cfg.schemaVersion, manifest.minCompatibleSchemaMajor || 0)) {
      showFatal(
        `This character file was built against schema v${cfg.schemaVersion}, ` +
        `but the current editor requires v${manifest.minCompatibleSchemaMajor}+. ` +
        `Please ask for an updated file.`,
        manifest.discord
      );
      return;
    }

    setStatus("Loading styles…");
    const styles = manifest.styles || [];
    const styleTexts = await Promise.all(styles.map(p => fetchText(asUrl(p), p)));
    styleTexts.forEach(injectStyle);

    setStatus("Loading editor modules…");
    const scripts = manifest.scripts || [];
    for (const s of scripts) {
      const text = await fetchText(asUrl(s), s);
      injectScript(text, s);
    }

    setStatus("Loading character data…");
    characterData = embedded;
    if (cfg.characterPath) {
      try {
        characterData = JSON.parse(await fetchText(`${repoBase}/${cfg.characterPath}`, "character file"));
      } catch (charErr) {
        if (charErr.status === 404) {
          showFatal(
            `The character file "${cfg.characterPath}" no longer exists in the repo.`,
            manifest.discord
          );
          return;
        }
        // network error → use embedded
      }
    }
    if (!characterData) throw new Error("No character data — neither remote fetch nor embedded snapshot worked.");

    if (typeof Library !== "undefined" && manifest.library?.manifestPath) {
      setStatus("Loading library…");
      try {
        await loadLibraryFromManifest(manifest.library);
      } catch {
        // Non-fatal — editor renders without library data
      }
    }

  } catch (err) {
    showError(err.message || String(err), err.url || "");
    return;
  }

  // ── Render editor chrome + mount ─────────────────────────────────────
  if (loadingEl) loadingEl.hidden = true;
  if (rootEl) rootEl.hidden = false;
  renderEditorChrome();

  function renderEditorChrome() {
    rootEl.innerHTML = `
      <header class="se-toolbar">
        <div class="se-title">
          <span class="se-label">Editing</span>
          <span class="se-name" id="se-name">${escapeHtml(characterData.identity?.name || "Character")}</span>
        </div>
        <span class="se-status" id="se-save-status">✓ loaded</span>
        <button class="se-btn" id="se-pat-btn">🔑 GitHub</button>
        <button class="se-btn se-btn-primary" id="se-save-btn">💾 Save</button>
      </header>

      <main class="se-main">
        <section class="se-edit-pane" id="se-edit-pane"></section>
        <aside class="se-preview-pane">
          <div class="se-preview-header">
            <span class="se-live-dot"></span>
            <span>Live preview</span>
          </div>
          <div class="se-preview-body" id="se-preview-body"></div>
        </aside>
      </main>

      <div class="se-pat-drawer" id="se-pat-drawer" hidden>
        <h3>GitHub Connection <button class="se-close" id="se-pat-close">×</button></h3>
        <p>This editor commits character changes to <code>${escapeHtml(cfg.owner)}/${escapeHtml(cfg.repo)}</code> on the <code>${escapeHtml(cfg.branch)}</code> branch. Each player uses their own personal access token (PAT).</p>
        <div class="se-pat-status" id="se-pat-status">
          <span class="se-pat-status-label">Status</span>
          <span class="se-pat-status-value" id="se-pat-status-value">${getStoredPat() ? "Token saved (untested)" : "No token"}</span>
        </div>
        <label>Personal Access Token</label>
        <input type="password" id="se-pat-input" placeholder="github_pat_…" value="${escapeAttr(getStoredPat())}" />
        <div class="se-pat-actions">
          <button class="se-btn se-btn-primary" id="se-pat-test">Test connection</button>
          <button class="se-btn" id="se-pat-save">Save token</button>
          <button class="se-btn se-btn-warn" id="se-pat-clear">Forget</button>
        </div>
        <p class="se-pat-help">Get one at <code>github.com/settings/personal-access-tokens</code>. Fine-grained, repo: <code>Only this repo</code>, permissions: <code>Contents: Read and write</code>.</p>
      </div>
    `;

    wireChrome();
    mountEditor();
    mountPreview();
  }

  // ── Mount editor + live preview wiring ───────────────────────────────
  let editorHandle = null;

  function mountEditor() {
    if (typeof Editor === "undefined" || typeof Editor.mount !== "function") {
      $("se-edit-pane").innerHTML = `<div class="se-error-inline">Editor module did not load.</div>`;
      return;
    }
    editorHandle = Editor.mount($("se-edit-pane"), characterData, {
      onChange: (latest) => {
        characterData = latest;
        const nameEl = $("se-name");
        if (nameEl) nameEl.textContent = latest.identity?.name || "Character";
        markDirty();
        refreshPreview();
      }
    });
  }

  function mountPreview() {
    if (typeof ViewCharacter === "undefined" || typeof ViewCharacter.mount !== "function") return;
    refreshPreview();
  }

  let previewTimer = null;
  function refreshPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      try {
        const latest = editorHandle ? editorHandle.getCurrentCharacter() : characterData;
        ViewCharacter.mount($("se-preview-body"), latest);
      } catch (err) {
        console.error("Preview render failed:", err);
      }
    }, 200);
  }

  // ── Toolbar wiring ──────────────────────────────────────────────────
  function wireChrome() {
    $("se-pat-btn").addEventListener("click", () => $("se-pat-drawer").hidden = !$("se-pat-drawer").hidden);
    $("se-pat-close").addEventListener("click", () => $("se-pat-drawer").hidden = true);
    $("se-pat-save").addEventListener("click", () => {
      const v = $("se-pat-input").value.trim();
      setStoredPat(v);
      setPatStatus(v ? "Token saved (untested)" : "No token");
      flashStatus("✓ saved");
    });
    $("se-pat-clear").addEventListener("click", () => {
      $("se-pat-input").value = "";
      setStoredPat("");
      setPatStatus("No token");
    });
    $("se-pat-test").addEventListener("click", testPat);
    $("se-save-btn").addEventListener("click", saveToGithub);
  }

  function setPatStatus(text) { const el = $("se-pat-status-value"); if (el) el.textContent = text; }
  function markDirty() { const s = $("se-save-status"); if (s) { s.textContent = "● unsaved changes"; s.dataset.state = "dirty"; } }
  function flashStatus(text) { const s = $("se-save-status"); if (s) s.textContent = text; }

  async function testPat() {
    const pat = $("se-pat-input").value.trim() || getStoredPat();
    if (!pat) { setPatStatus("No token to test"); return; }
    setPatStatus("Testing…");
    try {
      const res = await fetch("https://api.github.com/user", { headers: { Authorization: `token ${pat}` } });
      if (!res.ok) { setPatStatus(`✗ HTTP ${res.status}`); return; }
      const user = await res.json();
      setPatStatus(`✓ Connected as ${user.login || "(unknown)"}`);
    } catch (err) {
      setPatStatus(`✗ ${err.message}`);
    }
  }

  async function saveToGithub() {
    const pat = getStoredPat();
    if (!pat) {
      $("se-pat-drawer").hidden = false;
      setPatStatus("Need a PAT before saving");
      return;
    }
    if (!cfg.characterPath) { showError("Cannot save — no character path metadata.", ""); return; }

    flashStatus("↻ saving…");
    const latest = editorHandle.getCurrentCharacter();
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(cfg.characterPath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(cfg.branch)}`;

    let sha = null;
    try {
      const probe = await fetch(apiUrl, { headers: { Authorization: `token ${pat}` } });
      if (probe.ok) sha = (await probe.json()).sha;
    } catch {}

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(latest, null, 2))));
    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(cfg.characterPath).replace(/%2F/g, "/")}`;
    const body = {
      message: `Update ${latest.identity?.name || "character"} via shareable editor`,
      content,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    };

    try {
      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { Authorization: `token ${pat}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        flashStatus(`✗ ${res.status}`);
        showError(`Save failed: ${res.status} — ${text.slice(0, 200)}`, putUrl);
        return;
      }
      characterData = latest;
      flashStatus(`✓ saved · ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      flashStatus(`✗ ${err.message}`);
    }
  }

  // ── Library loader (mirrors viewer shell) ────────────────────────────
  async function loadLibraryFromManifest(libCfg) {
    const libManifestUrl = asUrl(libCfg.manifestPath, libCfg.basePath);
    const libManifest = JSON.parse(await fetchText(libManifestUrl, "library manifest"));
    const seeded = {};
    const collections = libManifest.collections || {};
    const concurrency = Math.max(1, libCfg.concurrency || 8);

    for (const collectionName of Object.keys(collections)) {
      const records = collections[collectionName] || [];
      const entries = new Array(records.length);
      let cursor = 0;
      async function worker() {
        while (true) {
          const i = cursor++;
          if (i >= records.length) return;
          const rec = records[i];
          if (!rec.path) continue;
          try {
            const url = /^https?:/.test(rec.path) ? rec.path : `${repoBase}/${rec.path}`;
            entries[i] = JSON.parse(await fetchText(url, rec.path));
          } catch { /* missing record skipped */ }
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, worker));
      seeded[collectionName] = { version: 1, collection: collectionName, entries: entries.filter(Boolean) };
    }
    Library.seedCollections(seeded);
  }

  function escapeHtml(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

})();
