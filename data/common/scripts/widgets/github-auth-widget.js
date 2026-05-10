/**
 * github-auth-widget.js
 * Shared GitHub auth drawer for Editor and Session View.
 */

const GitHubAuthWidget = (() => {
  const DRAWER_ID = "github-auth-drawer";
  let identityCache = null;
  let lastConfigSignature = "";

  function ensure() {
    let drawer = document.getElementById(DRAWER_ID);
    if (drawer) return drawer;

    installStyles();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="${DRAWER_ID}" class="github-auth-shell" hidden>
        <div class="github-auth-scrim" data-auth-close></div>
        <aside class="github-auth-drawer" role="dialog" aria-modal="true" aria-labelledby="github-auth-title">
          <div class="github-auth-header">
            <div>
              <div class="github-auth-kicker">Runtime Auth</div>
              <h2 id="github-auth-title">GitHub Connection</h2>
            </div>
            <button type="button" class="button button-ghost button-sm" data-auth-close>Close</button>
          </div>
          <p class="text-muted text-sm github-auth-copy">
            Stored only in this browser. Exported files stay tiny; the runtime unlocks authenticated behavior after boot.
          </p>

          <div id="github-auth-status" class="github-auth-status">
            <div class="github-auth-status-label">Not tested yet</div>
            <div class="text-muted text-sm">Use Test Connection to verify the current token and repo access.</div>
          </div>

          <div class="github-auth-fields">
            <label class="github-auth-field">
              <span>Personal Access Token</span>
              <input id="github-auth-token" class="field-input" type="password" autocomplete="off" placeholder="github_pat_xxx" />
            </label>
            <label class="github-auth-field">
              <span>Repository Owner</span>
              <input id="github-auth-owner" class="field-input" type="text" placeholder="e.g. Lulukitty22" />
            </label>
            <label class="github-auth-field">
              <span>Repository Name</span>
              <input id="github-auth-repo" class="field-input" type="text" placeholder="e.g. Character_Manager" />
            </label>
            <label class="github-auth-field">
              <span>Branch</span>
              <input id="github-auth-branch" class="field-input" type="text" placeholder="staging" />
            </label>
          </div>

          <div class="github-auth-actions">
            <button type="button" class="button button-primary" id="github-auth-test">Test Connection</button>
            <button type="button" class="button button-ghost" id="github-auth-save">Save</button>
            <button type="button" class="button button-danger" id="github-auth-disconnect">Disconnect</button>
          </div>

          <div class="github-auth-help">
            <h3>How to get a PAT</h3>
            <ol>
              <li>Visit <code>github.com/settings/personal-access-tokens</code></li>
              <li>Generate a fine-grained token</li>
              <li>Grant repository access to this repo only</li>
              <li>Grant <strong>Contents: Read and write</strong></li>
            </ol>
          </div>
        </aside>
      </div>
    `;
    document.body.appendChild(wrapper.firstElementChild);
    drawer = document.getElementById(DRAWER_ID);

    drawer.querySelectorAll("[data-auth-close]").forEach((button) => {
      button.addEventListener("click", close);
    });
    drawer.querySelector("#github-auth-save")?.addEventListener("click", saveConfig);
    drawer.querySelector("#github-auth-test")?.addEventListener("click", testConfig);
    drawer.querySelector("#github-auth-disconnect")?.addEventListener("click", disconnect);
    drawer.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });

    return drawer;
  }

  function installStyles() {
    if (document.getElementById("github-auth-widget-style")) return;
    const style = document.createElement("style");
    style.id = "github-auth-widget-style";
    style.textContent = `
      .github-auth-shell { position: fixed; inset: 0; z-index: 9000; }
      .github-auth-scrim { position: absolute; inset: 0; background: rgba(6, 5, 10, 0.76); backdrop-filter: blur(4px); }
      .github-auth-drawer {
        position: absolute; top: 0; right: 0; bottom: 0; width: min(440px, 100%);
        background: linear-gradient(180deg, rgba(20,16,28,0.98), rgba(12,9,18,0.98));
        border-left: 1px solid rgba(201,168,76,0.18); box-shadow: -18px 0 40px rgba(0,0,0,0.34);
        padding: 24px; overflow-y: auto; display: grid; align-content: start; gap: 16px;
      }
      .github-auth-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .github-auth-kicker { color: var(--text-dim); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; }
      .github-auth-header h2 { margin: 4px 0 0; font-size: 1.2rem; }
      .github-auth-status {
        display: grid; gap: 6px; padding: 14px 16px; border-radius: 14px;
        border: 1px solid rgba(201,168,76,0.14); background: rgba(255,255,255,0.03);
      }
      .github-auth-status.is-ready { border-color: rgba(114,187,132,0.35); background: rgba(80,138,96,0.12); }
      .github-auth-status.is-error { border-color: rgba(196,94,94,0.34); background: rgba(196,94,94,0.10); }
      .github-auth-status.is-testing { border-color: rgba(110,195,217,0.34); background: rgba(110,195,217,0.10); }
      .github-auth-status-label { font-weight: 700; }
      .github-auth-who { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
      .github-auth-avatar {
        width: 36px; height: 36px; border-radius: 999px; overflow: hidden;
        border: 1px solid rgba(201,168,76,0.18); background: rgba(255,255,255,0.06);
        display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;
      }
      .github-auth-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .github-auth-fields { display: grid; gap: 12px; }
      .github-auth-field { display: grid; gap: 6px; }
      .github-auth-field span { color: var(--text-dim); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.08em; }
      .github-auth-actions { display: flex; flex-wrap: wrap; gap: 10px; }
      .github-auth-help { display: grid; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(201,168,76,0.10); }
      .github-auth-help h3 { margin: 0; font-size: 0.95rem; }
      .github-auth-help ol { margin: 0; padding-left: 18px; color: var(--text-dim); font-size: var(--text-sm); }
      .github-auth-help code { font-family: var(--font-mono); color: var(--color-gold); }
    `;
    document.head.appendChild(style);
  }

  function syncFields() {
    const drawer = ensure();
    const config = GitHub.getConfig();
    drawer.querySelector("#github-auth-token").value = config.token || "";
    drawer.querySelector("#github-auth-owner").value = config.owner || "";
    drawer.querySelector("#github-auth-repo").value = config.repo || "";
    drawer.querySelector("#github-auth-branch").value = config.branch || "staging";
  }

  function saveConfig() {
    const drawer = ensure();
    localStorage.setItem("githubToken", drawer.querySelector("#github-auth-token").value.trim());
    localStorage.setItem("githubOwner", drawer.querySelector("#github-auth-owner").value.trim());
    localStorage.setItem("githubRepo", drawer.querySelector("#github-auth-repo").value.trim());
    localStorage.setItem("githubBranch", drawer.querySelector("#github-auth-branch").value.trim() || "staging");
    setStatus({
      tone: "ready",
      title: "Settings saved",
      detail: "This browser will use the saved repo + PAT on the next authenticated action.",
      identity: identityCache,
    });
    emitAuthChanged();
    ViewCharacterUtils?.showToast?.("GitHub settings saved for this browser.", "info");
  }

  async function testConfig() {
    const drawer = ensure();
    saveConfig();
    setStatus({
      tone: "testing",
      title: "Testing connection...",
      detail: "Checking repo access and the connected GitHub identity.",
      identity: null,
    });

    try {
      const verify = await GitHub.verifyConfig();
      if (!verify.ok) {
        setStatus({
          tone: "error",
          title: "Could not connect",
          detail: verify.error || "Unknown GitHub connection error.",
          identity: null,
        });
        return;
      }

      identityCache = await GitHub.readCurrentUser().catch(() => null);
      setStatus({
        tone: "ready",
        title: "Connected",
        detail: "PAT verified with repo access.",
        identity: identityCache,
      });
      emitAuthChanged();
      ViewCharacterUtils?.showToast?.("GitHub connection verified.", "success");
    } catch (error) {
      setStatus({
        tone: "error",
        title: "Could not connect",
        detail: error.message || String(error),
        identity: null,
      });
    }
  }

  function disconnect() {
    ["githubToken", "githubOwner", "githubRepo", "githubBranch"].forEach((key) => localStorage.removeItem(key));
    identityCache = null;
    syncFields();
    setStatus({
      tone: "",
      title: "Disconnected",
      detail: "Local browser auth has been cleared.",
      identity: null,
    });
    emitAuthChanged();
    ViewCharacterUtils?.showToast?.("GitHub auth cleared from this browser.", "info");
  }

  function setStatus({ tone = "", title = "", detail = "", identity = null } = {}) {
    const drawer = ensure();
    const status = drawer.querySelector("#github-auth-status");
    status.className = `github-auth-status${tone ? ` is-${tone}` : ""}`;
    status.innerHTML = `
      <div class="github-auth-status-label">${escapeHTML(title)}</div>
      <div class="text-muted text-sm">${escapeHTML(detail)}</div>
      ${renderIdentity(identity)}
    `;
  }

  function renderIdentity(identity) {
    if (!identity?.login) return "";
    const avatar = identity.avatarUrl
      ? `<span class="github-auth-avatar"><img src="${escapeAttr(identity.avatarUrl)}" alt="" /></span>`
      : `<span class="github-auth-avatar">${escapeHTML(identity.login.slice(0, 1).toUpperCase())}</span>`;
    const scope = [identity.repo ? `repo: ${identity.repo}` : "", "scope: contents:write"].filter(Boolean).join(" | ");
    return `
      <div class="github-auth-who">
        ${avatar}
        <div>
          <div>${escapeHTML(identity.login)}</div>
          <div class="text-muted text-sm">${escapeHTML(scope)}</div>
        </div>
      </div>
    `;
  }

  function open() {
    const drawer = ensure();
    syncFields();
    drawer.hidden = false;
    const config = GitHub.getConfig();
    if (config.token && config.owner && config.repo) {
      setStatus({
        tone: identityCache?.login ? "ready" : "",
        title: identityCache?.login ? "Connected" : "Stored locally",
        detail: identityCache?.login
          ? "This browser already has working auth saved."
          : "This browser has saved auth, but it has not been verified in this session.",
        identity: identityCache,
      });
    } else {
      setStatus({
        tone: "",
        title: "No GitHub auth saved",
        detail: "Add a PAT in this browser to unlock authenticated actions.",
        identity: null,
      });
    }
  }

  function close() {
    const drawer = ensure();
    drawer.hidden = true;
  }

  function emitAuthChanged() {
    const config = GitHub.getConfig();
    const signature = JSON.stringify({
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      configured: GitHub.isConfigured(),
    });
    if (signature === lastConfigSignature) return;
    lastConfigSignature = signature;
    window.dispatchEvent(new CustomEvent("github-auth-changed", {
      detail: {
        configured: GitHub.isConfigured(),
        config,
      },
    }));
  }

  function attachTrigger(button) {
    if (!button || button.dataset.authWidgetBound === "true") return;
    button.dataset.authWidgetBound = "true";
    button.addEventListener("click", open);
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(text) {
    return escapeHTML(text).replace(/`/g, "&#96;");
  }

  return {
    ensure,
    open,
    close,
    attachTrigger,
    syncFields,
    testConfig,
  };
})();
