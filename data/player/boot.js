(async function () {
  "use strict";

  const root = document.getElementById("app-root") || document.body;

  function readMeta(name, fallback = "") {
    const el = document.querySelector(`meta[name="${name}"]`);
    return (el && el.getAttribute("content")) || fallback;
  }

  const cfg = {
    mode: "player",
    characterId: readMeta("character-id"),
    characterPath: readMeta("character-path"),
    schemaVersion: readMeta("schema-version"),
    owner: readMeta("github-owner"),
    repo: readMeta("github-repo"),
    branch: readMeta("github-branch", "staging"),
  };

  if (typeof globalThis !== "undefined") {
    globalThis.__SHEET_BOOT_CONFIG__ = cfg;
  }

  const repoBase = cfg.owner && cfg.repo
    ? `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}`
    : "";

  installBaseShellStyles();
  renderLoadingShell();

  if (!repoBase || !cfg.characterPath) {
    showError("Exported file is missing required GitHub or character metadata.", "");
    return;
  }

  try {
    const manifestUrl = `${repoBase}/data/player/manifest.json`;
    updateLoading(0.08, "Fetching session view manifest...", manifestUrl);
    const manifest = await fetchJson(manifestUrl, "session view manifest");

    if (!compareSchemaMajor(cfg.schemaVersion, manifest.minCompatibleSchemaMajor || 0)) {
      showFatal(
        `This file was built for schema v${cfg.schemaVersion}, but the current player runtime requires v${manifest.minCompatibleSchemaMajor}+.`,
        manifest.discord
      );
      return;
    }

    const styles = manifest.styles || [];
    updateLoading(0.16, "Loading styles...", `${styles.length} stylesheet(s)`);
    for (let i = 0; i < styles.length; i += 1) {
      const path = styles[i];
      injectStyle(await fetchText(asUrl(path), path));
      updateLoading(0.16 + ((i + 1) / Math.max(styles.length, 1)) * 0.08, `Loading styles: ${i + 1}/${styles.length}`, path);
    }

    const scripts = manifest.scripts || [];
    updateLoading(0.28, "Loading session view code...", `${scripts.length} script(s)`);
    for (let i = 0; i < scripts.length; i += 1) {
      const path = scripts[i];
      injectScript(await fetchText(asUrl(path), path), path);
      updateLoading(0.28 + ((i + 1) / Math.max(scripts.length, 1)) * 0.22, `Loading session view code: ${i + 1}/${scripts.length}`, path);
    }

    updateLoading(0.54, "Loading character data...", cfg.characterPath);
    const characterData = await fetchJson(`${repoBase}/${cfg.characterPath}`, "character file");

    if (typeof Library !== "undefined" && manifest.library?.manifestPath) {
      await loadLibraryFromManifest(manifest.library);
    }

    if (typeof SurfacePresets !== "undefined") SurfacePresets.setActivePreset("session_view");
    updateLoading(0.96, "Rendering...", "Mounting session view.");
    showContent();
    if (typeof PlayerApp !== "undefined" && typeof PlayerApp.mount === "function") {
      await PlayerApp.mount(document.getElementById("player-content"), characterData, cfg);
    } else {
      throw new Error("Session view runtime did not load.");
    }

    const name = characterData.identity?.name;
    if (name) document.title = `${name} - Session View`;
  } catch (error) {
    if (error && error.status === 404 && /character file/i.test(error.message || "")) {
      showFatal(`The character file "${cfg.characterPath}" no longer exists in the repo.`, "#VRLulu");
      return;
    }
    showError(error.message || String(error), error.url || "");
  }

  function installBaseShellStyles() {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: #09080c; color: #eee8f8; }
      body { font-family: Georgia, serif; }
      [hidden] { display: none !important; }
      #app-root { min-height: 100vh; }
      .shell-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .shell-card { width: min(760px, 100%); background: #14111a; border: 1px solid rgba(201,168,76,0.22); border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); }
      .shell-card h1 { margin: 0 0 12px; font-size: 1.4rem; }
      .shell-card p { margin: 0; line-height: 1.6; color: #c7c0d6; }
      .shell-stack { display: grid; gap: 14px; }
      .shell-progress { height: 10px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.06); border: 1px solid rgba(201,168,76,0.22); }
      .shell-progress-fill { height: 100%; width: 0; background: linear-gradient(90deg, #8f6f24, #d9bd66, #f2df9a); transition: width 160ms ease; }
      .shell-label { color: #8a8299; font-size: 0.88rem; }
      .shell-detail { color: #716a84; font-size: 0.78rem; word-break: break-word; }
      .shell-title { color: #f0eaf8; font-weight: 700; }
      #player-content { min-height: 100vh; }
    `;
    document.head.appendChild(style);
  }

  function renderLoadingShell() {
    root.innerHTML = `
      <div id="state-loading" class="shell-state">
        <div class="shell-card shell-stack">
          <div class="shell-label">Session View Boot</div>
          <div class="shell-title" id="loading-status">Preparing session view...</div>
          <div class="shell-progress"><div id="loading-progress-fill" class="shell-progress-fill"></div></div>
          <div id="loading-detail" class="shell-detail"></div>
        </div>
      </div>
      <div id="state-error" class="shell-state" hidden>
        <div class="shell-card shell-stack">
          <h1>Could not load session view</h1>
          <p id="error-message">Unknown error.</p>
          <p id="error-url" class="shell-detail"></p>
        </div>
      </div>
      <div id="state-fatal" class="shell-state" hidden>
        <div class="shell-card shell-stack">
          <h1>This player file is out of date</h1>
          <p id="fatal-reason">The behind-the-scenes setup that runs this file has changed.</p>
          <p class="shell-detail">Please ask <strong id="fatal-discord">#VRLulu</strong> for an updated file.</p>
        </div>
      </div>
      <main id="player-content" hidden></main>
    `;
  }

  function updateLoading(progress, status, detail) {
    const fill = document.getElementById("loading-progress-fill");
    const statusEl = document.getElementById("loading-status");
    const detailEl = document.getElementById("loading-detail");
    if (fill && typeof progress === "number") {
      fill.style.width = `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%`;
    }
    if (statusEl) statusEl.textContent = status || "";
    if (detailEl) detailEl.textContent = detail || "";
  }

  function showError(message, url) {
    const loading = document.getElementById("state-loading");
    const error = document.getElementById("state-error");
    if (loading) loading.hidden = true;
    if (error) error.hidden = false;
    const messageEl = document.getElementById("error-message");
    const urlEl = document.getElementById("error-url");
    if (messageEl) messageEl.textContent = message;
    if (urlEl) urlEl.textContent = url || "";
  }

  function showFatal(reason, contactDiscord) {
    const loading = document.getElementById("state-loading");
    const error = document.getElementById("state-error");
    const fatal = document.getElementById("state-fatal");
    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    if (fatal) fatal.hidden = false;
    const reasonEl = document.getElementById("fatal-reason");
    const discordEl = document.getElementById("fatal-discord");
    if (reasonEl) reasonEl.textContent = reason;
    if (discordEl) discordEl.textContent = contactDiscord || "#VRLulu";
  }

  function showContent() {
    const loading = document.getElementById("state-loading");
    const error = document.getElementById("state-error");
    const fatal = document.getElementById("state-fatal");
    const content = document.getElementById("player-content");
    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    if (fatal) fatal.hidden = true;
    if (content) content.hidden = false;
  }

  async function fetchText(url, label) {
    let response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (error) {
      const err = new Error(`Network error loading ${label}: ${error.message}`);
      err.url = url;
      throw err;
    }
    if (!response.ok) {
      const err = new Error(`HTTP ${response.status} loading ${label}`);
      err.url = url;
      err.status = response.status;
      throw err;
    }
    return response.text();
  }

  async function fetchJson(url, label) {
    try {
      return JSON.parse(await fetchText(url, label));
    } catch (error) {
      if (error.url) throw error;
      const err = new Error(`Invalid JSON loading ${label}: ${error.message}`);
      err.url = url;
      throw err;
    }
  }

  function injectStyle(cssText) {
    const tag = document.createElement("style");
    tag.textContent = cssText;
    document.head.appendChild(tag);
  }

  function injectScript(jsText, label) {
    const tag = document.createElement("script");
    tag.textContent = `${jsText}\n//# sourceURL=${label}`;
    document.head.appendChild(tag);
  }

  function asUrl(relPath) {
    if (/^https?:/.test(relPath)) return relPath;
    return `${repoBase}/${String(relPath).replace(/^\//, "")}`;
  }

  function compareSchemaMajor(embeddedVersion, minCompatible) {
    if (!embeddedVersion) return true;
    const major = parseInt(String(embeddedVersion).split(".")[0], 10);
    return Number.isFinite(major) && major >= minCompatible;
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

  async function loadLibraryFromManifest(libCfg) {
    const manifestUrl = asUrl(libCfg.manifestPath);
    updateLoading(0.60, "Loading library manifest...", manifestUrl);
    try {
      const libManifest = await fetchJson(manifestUrl, "library manifest");
      const seeded = {};
      const collections = libManifest.collections || {};
      const recordTasks = Object.keys(collections).flatMap((collectionName) =>
        (collections[collectionName] || [])
          .filter((entry) => entry && entry.path)
          .map((entry, index) => ({ collectionName, index, path: entry.path }))
      );
      const entriesByCollection = {};
      let loaded = 0;

      await mapWithConcurrency(recordTasks, libCfg.concurrency || 12, async (task) => {
        try {
          const record = await fetchJson(asUrl(task.path), task.path);
          if (!entriesByCollection[task.collectionName]) entriesByCollection[task.collectionName] = [];
          entriesByCollection[task.collectionName][task.index] = record;
        } finally {
          loaded += 1;
          updateLoading(
            0.60 + ((loaded / Math.max(recordTasks.length, 1)) * 0.28),
            `Loading library records: ${loaded}/${recordTasks.length}`,
            task.path
          );
        }
      });

      Object.keys(collections).forEach((collectionName) => {
        seeded[collectionName] = {
          version: 1,
          collection: collectionName,
          entries: (entriesByCollection[collectionName] || []).filter(Boolean),
        };
      });
      Library.seedCollections(seeded);
    } catch (error) {
      console.warn("Player library load failed:", error);
      updateLoading(0.90, "Library unavailable; continuing without records.", error.message || String(error));
    }
  }
})();
