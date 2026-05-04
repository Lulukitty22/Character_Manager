/**
 * share/viewer/index.js
 * ────────────────────────────────────────────────────────────────────────
 * Maintained auto-updating viewer loader.
 *
 * Exported character HTML files are tiny stubs that contain:
 *   - <meta> tags: character-id, character-path, schema-version,
 *                  github-owner, github-repo, github-branch
 *   - window.__EMBEDDED_CHARACTER__ — offline-fallback snapshot
 *   - <script src="…/share/viewer/index.js"> — this file
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
 *   6. Fetches the library manifest + record files, seeds Library
 *   7. Calls ViewCharacter.buildHTML() + wireInteractive()
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

  function setStatus(text) { if (statusEl) statusEl.textContent = text; }

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
    setStatus("Fetching renderer manifest…");
    const manifestUrl = `${repoBase}/share/viewer/manifest.json`;
    const manifestText = await fetchText(manifestUrl, "viewer manifest");
    const manifest = JSON.parse(manifestText);

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
    setStatus("Loading styles…");
    const styles = manifest.styles || [];
    const styleTexts = await Promise.all(
      styles.map(p => fetchText(asUrl(p), p))
    );
    styleTexts.forEach(injectStyle);

    // 4. Load scripts in declared order
    setStatus("Loading renderer…");
    const scripts = manifest.scripts || [];
    for (const scriptPath of scripts) {
      const text = await fetchText(asUrl(scriptPath), scriptPath);
      injectScript(text, scriptPath);
    }

    // 5. Fetch latest character — fall back to embedded on network failure,
    //    but treat 404 (deliberately deleted/renamed) as fatal.
    setStatus("Loading character data…");
    let characterData = embedded;
    if (cfg.characterPath) {
      try {
        const charText = await fetchText(`${repoBase}/${cfg.characterPath}`, "character file");
        characterData = JSON.parse(charText);
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
    if (!characterData) throw new Error("No character data — neither remote fetch nor embedded snapshot succeeded.");

    // 6. Seed library
    if (typeof Library !== "undefined" && manifest.library?.manifestPath) {
      setStatus("Loading library…");
      const libManifestUrl = asUrl(manifest.library.manifestPath, manifest.library.basePath);
      try {
        const libManifest = JSON.parse(await fetchText(libManifestUrl, "library manifest"));
        const seeded = {};
        const collections = libManifest.collections || {};
        for (const collectionName of Object.keys(collections)) {
          const records = collections[collectionName] || [];
          const entries = [];
          for (const rec of records) {
            if (!rec.path) continue;
            try {
              const recordUrl = /^https?:/.test(rec.path) ? rec.path : `${repoBase}/${rec.path}`;
              entries.push(JSON.parse(await fetchText(recordUrl, rec.path)));
            } catch (recErr) {
              // Missing/broken record shouldn't kill the whole sheet
            }
          }
          seeded[collectionName] = { version: 1, collection: collectionName, entries };
        }
        Library.seedCollections(seeded);
      } catch (libErr) {
        // Library load failures degrade gracefully — sheet renders without library data
      }
    }

    // 7. Render
    setStatus("Rendering…");
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
