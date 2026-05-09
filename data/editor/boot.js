(async function () {
  "use strict";

  const root = document.getElementById("app-root") || document.body;

  function readMeta(name, fallback = "") {
    const el = document.querySelector(`meta[name="${name}"]`);
    return (el && el.getAttribute("content")) || fallback;
  }

  const cfg = {
    characterId: readMeta("character-id"),
    characterPath: readMeta("character-path"),
    schemaVersion: readMeta("schema-version"),
    owner: readMeta("github-owner"),
    repo: readMeta("github-repo"),
    branch: readMeta("github-branch", "staging"),
  };

  const repoBase = cfg.owner && cfg.repo
    ? `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}`
    : "";

  installBaseShellStyles();
  renderLoadingShell();

  if (!repoBase) {
    failBootstrap("Editor shim is missing GitHub owner/repo metadata.");
    return;
  }

  try {
    const manifestUrl = `${repoBase}/data/editor/manifest.json`;
    setStatus("Fetching editor manifest...", manifestUrl, 0.08);
    const manifest = await fetchJson(manifestUrl, "editor manifest");

    if (cfg.characterPath && !compareSchemaMajor(cfg.schemaVersion, manifest.minCompatibleSchemaMajor || 0)) {
      showFatal(
        `This file was built for schema v${cfg.schemaVersion}, but the current editor requires v${manifest.minCompatibleSchemaMajor}+ .`,
        manifest.discord
      );
      return;
    }

    const styles = manifest.styles || [];
    setStatus("Loading styles...", `${styles.length} stylesheet(s)`, 0.14);
    for (let i = 0; i < styles.length; i += 1) {
      const path = styles[i];
      injectStyle(await fetchText(asUrl(path), path));
      setStatus(`Loading styles: ${i + 1}/${styles.length}`, path, 0.14 + ((i + 1) / Math.max(styles.length, 1)) * 0.08);
    }

    const scripts = manifest.scripts || [];
    setStatus("Loading manager code...", `${scripts.length} script(s)`, 0.26);
    for (let i = 0; i < scripts.length; i += 1) {
      const path = scripts[i];
      injectScript(await fetchText(asUrl(path), path), path);
      setStatus(`Loading manager code: ${i + 1}/${scripts.length}`, path, 0.26 + ((i + 1) / Math.max(scripts.length, 1)) * 0.18);
    }

    if (cfg.characterPath && typeof Library !== "undefined" && manifest.library?.manifestPath) {
      await loadLibraryFromManifest(manifest.library);
    }

    renderManagerShell();
    if (typeof App !== "undefined" && typeof App.init === "function") {
      App.init();
    } else {
      throw new Error("Manager runtime did not load.");
    }
  } catch (error) {
    failBootstrap(error.message || String(error), error.url || "");
  }

  function installBaseShellStyles() {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: #0a090d; color: #e8e4f0; }
      [hidden] { display: none !important; }
      body { font-family: Georgia, serif; }
      #app-root { min-height: 100vh; }
      .boot-shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .boot-card { width: min(720px, 100%); background: #13111a; border: 1px solid rgba(201,168,76,0.22); border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.35); display: grid; gap: 14px; }
      .boot-label { color: #8a8299; font-size: 0.88rem; }
      .boot-title { color: #f0eaf8; font-weight: 700; font-size: 1.25rem; }
      .boot-detail { color: #716a84; font-size: 0.78rem; word-break: break-word; }
      .boot-progress { height: 10px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,0.06); border: 1px solid rgba(201,168,76,0.22); }
      .boot-progress-fill { height: 100%; width: 0; background: linear-gradient(90deg, #8f6f24, #d9bd66, #f2df9a); transition: width 160ms ease; }
      .boot-error { white-space: pre-wrap; line-height: 1.6; color: #c7c0d6; }
    `;
    document.head.appendChild(style);
  }

  function renderLoadingShell() {
    root.innerHTML = `
      <div class="boot-shell" id="boot-shell">
        <div class="boot-card">
          <div class="boot-label">Editor Boot</div>
          <div class="boot-title" id="boot-status">Preparing manager...</div>
          <div class="boot-progress"><div class="boot-progress-fill" id="boot-progress-fill"></div></div>
          <div class="boot-detail" id="boot-detail"></div>
        </div>
      </div>
    `;
  }

  function renderManagerShell() {
    root.innerHTML = `
      <header id="app-header">
        <div id="app-logo">Character <span>Manager</span></div>
        <nav id="app-nav">
          <button class="nav-item" data-nav-target="list">Characters</button>
          <button class="nav-item" data-nav-target="library">Library</button>
          <button class="nav-item" data-nav-target="settings">Settings</button>
        </nav>
      </header>
      <div id="app-body">
        <main id="main-content"></main>
      </div>
      <div id="loading-overlay" class="hidden">
        <div class="spinner"></div>
        <p class="loading-message">Loading...</p>
      </div>
      <div id="toast-container"></div>
    `;
  }

  function failBootstrap(message, url = "") {
    alert(`Could not load the manager.\n\n${message}`);
    root.innerHTML = `
      <div class="boot-shell">
        <div class="boot-card">
          <div class="boot-title">Could not load manager</div>
          <div class="boot-error">${escapeHtml(message)}</div>
          ${url ? `<div class="boot-detail">${escapeHtml(url)}</div>` : ""}
        </div>
      </div>
    `;
  }

  function showFatal(reason, contactDiscord) {
    root.innerHTML = `
      <div class="boot-shell">
        <div class="boot-card">
          <div class="boot-title">This editor file is out of date</div>
          <div class="boot-error">${escapeHtml(reason)}</div>
          <div class="boot-detail">Please ask ${escapeHtml(contactDiscord || "#VRLulu")} for an updated file.</div>
        </div>
      </div>
    `;
  }

  function setStatus(status, detail, progress) {
    const statusEl = document.getElementById("boot-status");
    const detailEl = document.getElementById("boot-detail");
    const fill = document.getElementById("boot-progress-fill");
    if (statusEl) statusEl.textContent = status || "";
    if (detailEl) detailEl.textContent = detail || "";
    if (fill && typeof progress === "number") {
      fill.style.width = `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%`;
    }
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
    setStatus("Loading library manifest...", manifestUrl, 0.56);
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
          setStatus(`Loading library records: ${loaded}/${recordTasks.length}`, task.path, 0.56 + ((loaded / Math.max(recordTasks.length, 1)) * 0.20));
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
      console.warn("Editor library load failed:", error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
