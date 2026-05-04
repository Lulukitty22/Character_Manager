/**
 * share/viewer/index.js
 * ────────────────────────────────────────────────────────────────────────
 * Maintained auto-updating viewer loader.
 *
 * Exported character HTML files are tiny stubs that contain:
 *   - <meta> tags: character-id, character-path, schema-version,
 *                  github-owner, github-repo, github-branch
 *   - window.__EMBEDDED_CHARACTER__ — offline-fallback snapshot
 *   - a tiny bootstrap that fetches and injects share/viewer/index.js
 *
 * On load, this script:
 *   1. Reads meta tags + embedded snapshot
 *   2. Fetches share/viewer/manifest.json (the cascade pointer)
 *   3. Validates schema major matches the manifest's minCompatibleSchemaMajor
 *      → if not, shows a fatal overlay with the Discord contact
 *   4. Loads all declared styles, then scripts (in order)
 *   5. Tries to fetch the latest character JSON from the repo
 *      → on 404 (file deleted/renamed): fatal overlay with Discord contact
 *      → on network error: falls back to embedded snapshot
 *   6. Fetches the library manifest + record files with bounded concurrency,
 *      then seeds Library
 *   7. Calls ViewCharacter.mount()
 *
 * The shell intentionally has no GitHub auth — it uses raw.githubusercontent.com
 * which serves public repos without a token. Editor flows (which need writes)
 * use share/editor/index.js with PAT support.
 * ────────────────────────────────────────────────────────────────────────
 */

(async function () {
  "use strict";

  // ── DOM refs ─────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const loadingEl = $("state-loading");
  const errorEl   = $("state-error");
  const fatalEl   = $("state-fatal");
  const contentEl = $("sheet-content");
  const statusEl  = $("loading-status");
  const detailEl  = $("loading-detail");
  const progressEl = $("loading-progress-fill");

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

  function setProgress(value, detail) {
    if (progressEl && typeof value === "number") {
      progressEl.style.width = `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`;
    }
    if (detailEl) detailEl.textContent = detail || "";
  }

  function updateLoading(value, status, detail) {
    setStatus(status);
    setProgress(value, detail);
  }

  function showError(message, url) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = false;
    const msg = $("error-message");
    const u = $("error-url");
    if (msg) msg.textContent = message;
    if (u) { u.href = url || ""; u.textContent = url || ""; }
  }

  function showFatal(reason, contactDiscord) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) errorEl.hidden = true;
    if (fatalEl) {
      fatalEl.hidden = false;
      const r = $("fatal-reason");
      const d = $("fatal-discord");
      if (r) r.textContent = reason;
      if (d) d.textContent = contactDiscord || "#VRLulu";
    }
  }

  // ── Read host stub configuration ─────────────────────────────────────
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

  // ── Helpers ──────────────────────────────────────────────────────────
  async function fetchText(url, label) {
    let res;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (err) {
      const e = new Error(`Network error loading ${label}: ${err.message}`);
      e.url = url; throw e;
    }
    if (!res.ok) {
      const e = new Error(`HTTP ${res.status} loading ${label}`);
      e.url = url; e.status = res.status; throw e;
    }
    return res.text();
  }

  async function fetchJson(url, label) {
    try {
      return JSON.parse(await fetchText(url, label));
    } catch (error) {
      if (error.url) throw error;
      const e = new Error(`Invalid JSON loading ${label}: ${error.message}`);
      e.url = url;
      throw e;
    }
  }

  async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(limit || 12, items.length || 1));
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }));
    return results;
  }

  function injectStyle(cssText) {
    const tag = document.createElement("style");
    tag.textContent = cssText;
    document.head.appendChild(tag);
  }

  function injectScript(jsText, label) {
    const tag = document.createElement("script");
    tag.textContent = jsText;
    try { document.head.appendChild(tag); }
    catch (err) { throw new Error(`Error executing ${label}: ${err.message}`); }
  }

  function asUrl(relPath, basePath) {
    if (/^https?:/.test(relPath)) return relPath;
    const base = basePath ? `${repoBase}/${basePath.replace(/\/?$/, "/")}` : `${repoBase}/`;
    return base + relPath.replace(/^\//, "");
  }

  function compareSchemaMajor(embeddedVersion, minCompatible) {
    if (!embeddedVersion) return true; // no embedded version = pre-handshake export, allow
    const major = parseInt(String(embeddedVersion).split(".")[0], 10);
    return Number.isFinite(major) && major >= minCompatible;
  }

  // ── Main loader ──────────────────────────────────────────────────────
  try {
    // 1. Fetch viewer manifest
    const manifestUrl = `${repoBase}/share/viewer/manifest.json`;
    updateLoading(0.06, "Fetching renderer manifest...", manifestUrl);
    const manifest = await fetchJson(manifestUrl, "viewer manifest");

    // 2. Schema-version handshake
    if (!compareSchemaMajor(cfg.schemaVersion, manifest.minCompatibleSchemaMajor || 0)) {
      showFatal(
        `This character file was built against schema v${cfg.schemaVersion}, ` +
        `but the current viewer requires v${manifest.minCompatibleSchemaMajor}+. ` +
        `Please ask for an updated file.`,
        manifest.discord
      );
      return;
    }

    // 3. Load styles
    updateLoading(0.12, "Loading styles...", `${(manifest.styles || []).length} stylesheet(s)`);
    const styles = manifest.styles || [];
    let loadedStyles = 0;
    const styleTexts = await Promise.all(styles.map(async p => {
      const text = await fetchText(asUrl(p), p);
      loadedStyles += 1;
      updateLoading(0.12 + (styles.length ? (loadedStyles / styles.length) * 0.08 : 0.08), `Loading styles: ${loadedStyles}/${styles.length}`, p);
      return text;
    }));
    styleTexts.forEach(injectStyle);

    // 4. Load scripts in declared order
    updateLoading(0.22, "Loading renderer...", `${(manifest.scripts || []).length} script(s)`);
    const scripts = manifest.scripts || [];
    for (let index = 0; index < scripts.length; index += 1) {
      const scriptPath = scripts[index];
      updateLoading(0.22 + (scripts.length ? (index / scripts.length) * 0.2 : 0), `Loading renderer: ${index + 1}/${scripts.length}`, scriptPath);
      const text = await fetchText(asUrl(scriptPath), scriptPath);
      injectScript(text, scriptPath);
    }

    // 5. Fetch latest character — fall back to embedded on network failure,
    //    but treat 404 (deliberately deleted/renamed) as fatal.
    updateLoading(0.45, "Loading character data...", cfg.characterPath || "Using embedded snapshot.");
    let characterData = embedded;
    if (cfg.characterPath) {
      try {
        characterData = await fetchJson(`${repoBase}/${cfg.characterPath}`, "character file");
      } catch (charErr) {
        if (charErr.status === 404) {
          showFatal(
            `The character file "${cfg.characterPath}" no longer exists in the repo. ` +
            `It may have been moved, renamed, or deleted.`,
            manifest.discord
          );
          return;
        }
        // Other failures: silently fall back to embedded
      }
    }
    if (!characterData) throw new Error("No character data - neither remote fetch nor embedded snapshot succeeded.");

    // 6. Seed library
    if (typeof Library !== "undefined" && manifest.library?.manifestPath) {
      const libManifestUrl = asUrl(manifest.library.manifestPath, manifest.library.basePath);
      updateLoading(0.52, "Loading library manifest...", libManifestUrl);
      try {
        const libManifest = await fetchJson(libManifestUrl, "library manifest");
        const seeded = {};
        const collections = libManifest.collections || {};
        const recordTasks = Object.keys(collections).flatMap(collectionName => {
          return (collections[collectionName] || [])
            .filter(rec => rec?.path)
            .map((rec, collectionIndex) => ({ collectionName, collectionIndex, path: rec.path }));
        });
        const entriesByCollection = {};
        const libraryIssues = [];
        let loadedRecords = 0;

        updateLoading(0.55, `Loading library records: 0/${recordTasks.length}`, "Fetching records in parallel.");
        await mapWithConcurrency(recordTasks, manifest.library.concurrency || 12, async task => {
          try {
            const recordUrl = /^https?:/.test(task.path) ? task.path : `${repoBase}/${task.path}`;
            const record = await fetchJson(recordUrl, task.path);
            if (!entriesByCollection[task.collectionName]) entriesByCollection[task.collectionName] = [];
            entriesByCollection[task.collectionName][task.collectionIndex] = record;
          } catch (recErr) {
            libraryIssues.push({
              collection: task.collectionName,
              path: task.path,
              message: recErr.message || String(recErr),
            });
          } finally {
            loadedRecords += 1;
            const issueText = libraryIssues.length
              ? ` (${libraryIssues.length} issue${libraryIssues.length === 1 ? "" : "s"})`
              : "";
            updateLoading(
              0.55 + (recordTasks.length ? (loadedRecords / recordTasks.length) * 0.34 : 0.34),
              `Loading library records: ${loadedRecords}/${recordTasks.length}${issueText}`,
              task.path
            );
          }
        });

        Object.keys(collections).forEach(collectionName => {
          seeded[collectionName] = {
            version: 1,
            collection: collectionName,
            entries: (entriesByCollection[collectionName] || []).filter(Boolean),
          };
        });
        Library.seedCollections(seeded);
        if (libraryIssues.length) {
          console.warn("Character viewer loaded with library issues:", libraryIssues);
        }
      } catch (libErr) {
        console.warn("Character viewer could not load library data:", libErr);
        updateLoading(0.89, "Library unavailable; rendering with embedded character data.", libErr.message || String(libErr));
      }
    }

    // 7. Render
    updateLoading(0.94, "Rendering...", "Mounting character sheet.");
    if (loadingEl) loadingEl.hidden = true;
    if (contentEl) {
      contentEl.hidden = false;
      if (typeof ViewCharacter.mount === "function") {
        ViewCharacter.mount(contentEl, characterData);
      } else {
        contentEl.innerHTML = ViewCharacter.buildHTML(characterData);
        ViewCharacter.wireInteractive(contentEl, characterData);
      }
    }

    // Title
    const name = characterData.identity?.name;
    if (name) document.title = `${name} — Character Sheet`;

  } catch (err) {
    showError(err.message || String(err), err.url || "");
  }

})();
