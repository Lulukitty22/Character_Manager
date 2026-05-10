const DungeonMasterApp = (() => {
  const POLL_INTERVAL_MS = 10000;
  const state = {
    context: {
      parties: [],
      sessions: [],
      encounters: [],
    },
    writable: false,
    alerts: [],
    lastNotice: "",
    lastNoticeTone: "neutral",
  };

  let mountedContainer = null;
  let pollTimer = null;
  let authListenerBound = false;

  async function mount(container) {
    mountedContainer = container;
    state.writable = typeof GitHub !== "undefined" && GitHub.isConfigured();
    if (typeof SurfacePresets !== "undefined") SurfacePresets.setActivePreset("dungeon_master");
    GitHubAuthWidget?.ensure?.();
    bindAuthListener();
    await refreshRuntimeData({ forceApi: state.writable, quiet: true });
    render(container);
    startPolling();
  }

  async function refreshRuntimeData({ forceApi = false, quiet = false } = {}) {
    if (forceApi && state.writable) {
      try {
        await Library.loadAll({ force: true });
      } catch (error) {
        if (!quiet) pushAlert(`Refresh fell back to cached data: ${error.message || String(error)}`, "negative");
      }
    }

    state.context = {
      parties: typeof Library !== "undefined" ? Library.list("parties") : [],
      sessions: typeof Library !== "undefined" ? Library.list("sessions") : [],
      encounters: typeof Library !== "undefined" ? Library.list("encounters") : [],
    };
    state.writable = typeof GitHub !== "undefined" && GitHub.isConfigured();
  }

  function render(container) {
    const activeSessions = (state.context.sessions || []).filter((entry) => isActiveStatus(entry.status));
    const activeEncounters = (state.context.encounters || []).filter((entry) => isActiveStatus(entry.status));
    const queuedEntries = collectQueueEntries();
    const historyEntries = collectHistoryEntries();
    const inboxEntries = buildInboxEntries(historyEntries);

    container.innerHTML = `
      <div class="dm-shell">
        <header class="dm-topbar">
          <div class="dm-topbar-inner">
            <div class="dm-title-group">
              <div class="dm-kicker">Dungeon Master</div>
              <div class="dm-title-row">
                <h1>Table Control</h1>
                <span class="badge badge-accent">${escapeHTML(activeSessions[0]?.name || "No active session")}</span>
              </div>
              <div class="text-muted text-sm">Approve, deny, and monitor queued gameplay actions while GitHub stays the canonical table state.</div>
            </div>
            <div class="dm-actions">
              <button class="button button-ghost button-sm" id="btn-dm-auth">GitHub</button>
              <button class="button button-ghost button-sm" id="btn-dm-refresh">Refresh</button>
            </div>
          </div>
        </header>

        <div class="dm-content">
          ${renderBanner()}

          <section class="dm-card span-12">
            <div class="dm-card-header">
              <div class="dm-card-copy">
                <h2>Overview</h2>
                <div class="dm-note">Live-ish session state from GitHub with 10-second polling plus manual refresh.</div>
              </div>
            </div>
            <div class="dm-stat-grid">
              ${renderStat("Parties", state.context.parties.length)}
              ${renderStat("Active Sessions", activeSessions.length)}
              ${renderStat("Active Encounters", activeEncounters.length)}
              ${renderStat("Queued Actions", queuedEntries.length)}
              ${renderStat("Recent Logged Actions", historyEntries.length)}
            </div>
          </section>

          <div class="dm-grid">
            <section class="dm-card span-6">
              <div class="dm-card-header">
                <div class="dm-card-copy">
                  <h2>Active Sessions</h2>
                  <div class="dm-note">Sessions own utility flow, downtime, and broader table context.</div>
                </div>
              </div>
              ${renderRecordList(activeSessions, "No active sessions right now.", renderSessionRow)}
            </section>

            <section class="dm-card span-6">
              <div class="dm-card-header">
                <div class="dm-card-copy">
                  <h2>Active Encounters</h2>
                  <div class="dm-note">Encounters own turn pressure, initiative, and combat queue pressure.</div>
                </div>
              </div>
              ${renderRecordList(activeEncounters, "No active encounters right now.", renderEncounterRow)}
            </section>

            <section class="dm-card span-8">
              <div class="dm-card-header">
                <div class="dm-card-copy">
                  <h2>Queued Actions</h2>
                  <div class="dm-note">This first pass can already approve or deny queued requests and write the resolution back to GitHub.</div>
                </div>
              </div>
              ${renderQueuedActions(queuedEntries)}
            </section>

            <section class="dm-card span-4">
              <div class="dm-card-header">
                <div class="dm-card-copy">
                  <h2>Session Inbox</h2>
                  <div class="dm-note">Sync notes and recent adjudication updates in one place.</div>
                </div>
              </div>
              ${renderInbox(inboxEntries)}
            </section>

            <section class="dm-card span-12">
              <div class="dm-card-header">
                <div class="dm-card-copy">
                  <h2>Recent History</h2>
                  <div class="dm-note">Resolution log snippets across active sessions and encounters.</div>
                </div>
              </div>
              ${renderHistory(historyEntries)}
            </section>
          </div>
        </div>
      </div>
    `;

    wire(container);
  }

  function renderBanner() {
    if (!state.writable) {
      return `
        <section class="dm-card span-12">
          <div class="dm-note">This Dungeon Master surface can read shared records without auth, but approve/deny actions only when a GitHub PAT is present in this browser.</div>
        </section>
      `;
    }
    if (state.lastNotice) {
      return `
        <section class="dm-card span-12">
          <div class="dm-note">${escapeHTML(state.lastNotice)}</div>
        </section>
      `;
    }
    return "";
  }

  function renderStat(label, value) {
    return `
      <div class="dm-stat">
        <div class="dm-stat-label">${escapeHTML(label)}</div>
        <div class="dm-stat-value">${escapeHTML(String(value))}</div>
      </div>
    `;
  }

  function renderRecordList(records = [], emptyMessage, renderer) {
    if (!records.length) return `<div class="dm-empty">${escapeHTML(emptyMessage)}</div>`;
    return `<div class="dm-list">${records.map(renderer).join("")}</div>`;
  }

  function renderSessionRow(session) {
    const party = state.context.parties.find((entry) => entry.id === session.partyRef);
    return `
      <div class="dm-row">
        <div class="dm-row-top">
          <div>
            <div class="dm-row-title">${escapeHTML(session.name || "Session")}</div>
            <div class="dm-row-meta">${escapeHTML([party?.name || "No party", session.mode || "session_utility", session.status || "unknown"].join(" | "))}</div>
          </div>
          <div class="dm-tags">
            <span class="badge">${escapeHTML(`${(session.queuedActions || []).length} queued`)}</span>
            <span class="badge">${escapeHTML(`${(session.actionLog || []).length} logged`)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderEncounterRow(encounter) {
    return `
      <div class="dm-row">
        <div class="dm-row-top">
          <div>
            <div class="dm-row-title">${escapeHTML(encounter.name || "Encounter")}</div>
            <div class="dm-row-meta">${escapeHTML([`Round ${Number(encounter.round || 0)}`, encounter.status || "unknown", `${(encounter.participants || []).length} participants`].join(" | "))}</div>
          </div>
          <div class="dm-tags">
            <span class="badge">${escapeHTML(`${(encounter.queuedActions || []).length} queued`)}</span>
            <span class="badge">${escapeHTML(`${(encounter.actionLog || []).length} logged`)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderQueuedActions(entries = []) {
    if (!entries.length) return `<div class="dm-empty">No queued actions right now.</div>`;
    return `
      <div class="dm-list">
        ${entries.map((entry, index) => `
          <div class="dm-row" data-queue-index="${index}">
            <div class="dm-row-top">
              <div>
                <div class="dm-row-title">${escapeHTML(entry.title)}</div>
                <div class="dm-row-meta">${escapeHTML(entry.meta)}</div>
              </div>
              <span class="badge">${escapeHTML(entry.scope)}</span>
            </div>
            ${entry.note ? `<div class="dm-note">${escapeHTML(entry.note)}</div>` : ""}
            <div class="dm-tags">
              ${entry.tags.map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}
            </div>
            <div class="dm-inline-actions">
              <button class="button button-primary button-sm btn-dm-approve" ${state.writable ? "" : "disabled"}>Approve</button>
              <button class="button button-danger button-sm btn-dm-deny" ${state.writable ? "" : "disabled"}>Deny</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderHistory(entries = []) {
    if (!entries.length) return `<div class="dm-empty">No logged actions yet.</div>`;
    return `
      <div class="dm-list">
        ${entries.map((entry) => `
          <div class="dm-row">
            <div class="dm-row-top">
              <div>
                <div class="dm-row-title">${escapeHTML(entry.title)}</div>
                <div class="dm-row-meta">${escapeHTML(entry.meta)}</div>
              </div>
              <span class="badge">${escapeHTML(entry.status)}</span>
            </div>
            ${entry.note ? `<div class="dm-note">${escapeHTML(entry.note)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderInbox(entries = []) {
    if (!entries.length) return `<div class="dm-empty">No inbox events yet.</div>`;
    return `
      <div class="dm-list">
        ${entries.map((entry) => `
          <div class="dm-row">
            <div class="dm-row-top">
              <div>
                <div class="dm-row-title">${escapeHTML(entry.title)}</div>
                <div class="dm-row-meta">${escapeHTML(entry.meta)}</div>
              </div>
              <span class="badge">${escapeHTML(entry.status || "notice")}</span>
            </div>
            ${entry.note ? `<div class="dm-note">${escapeHTML(entry.note)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }

  function wire(container) {
    container.querySelector("#btn-dm-auth")?.addEventListener("click", () => GitHubAuthWidget?.open?.());
    container.querySelector("#btn-dm-refresh")?.addEventListener("click", async () => {
      await refreshRuntimeData({ forceApi: state.writable, quiet: false });
      if (!state.lastNotice || state.lastNoticeTone !== "negative") {
        pushAlert(state.writable ? "Dungeon master context refreshed from GitHub." : "Refreshed using the current read-only data.", "positive", false);
      }
      render(container);
    });

    container.querySelectorAll(".btn-dm-approve").forEach((button) => {
      button.addEventListener("click", async () => {
        const row = button.closest("[data-queue-index]");
        const entry = collectQueueEntries()[Number(row?.dataset.queueIndex || -1)];
        if (entry) await resolveQueuedAction(entry, "approved");
      });
    });

    container.querySelectorAll(".btn-dm-deny").forEach((button) => {
      button.addEventListener("click", async () => {
        const row = button.closest("[data-queue-index]");
        const entry = collectQueueEntries()[Number(row?.dataset.queueIndex || -1)];
        if (entry) await resolveQueuedAction(entry, "denied");
      });
    });
  }

  async function resolveQueuedAction(entry, status) {
    if (!state.writable) {
      pushAlert("Approve/deny needs a GitHub PAT in this browser first.", "negative");
      render(mountedContainer);
      GitHubAuthWidget?.open?.();
      return;
    }

    const reply = window.prompt(
      status === "approved"
        ? "Optional DM reply for this approved action:"
        : "Optional DM reply for this denied action:",
      ""
    ) ?? "";

    const record = JSON.parse(JSON.stringify(entry.record));
    const featureKey = entry.collection === "encounters" ? "encounter" : "session";
    if (!record.features) record.features = {};
    if (!record.features[featureKey]) record.features[featureKey] = {};
    const branchState = record.features[featureKey];
    const queued = Array.isArray(branchState.queuedActions) ? branchState.queuedActions : [];
    const action = queued.find((candidate) => candidate.id === entry.action.id);
    if (!action) {
      pushAlert("That queued action no longer exists in the live record.", "negative");
      await refreshRuntimeData({ forceApi: true, quiet: true });
      render(mountedContainer);
      return;
    }

    branchState.queuedActions = queued.filter((candidate) => candidate.id !== entry.action.id);
    const resolved = GameplayRuntime.compactAction({
      ...action,
      status,
      resolution: {
        status,
        message: status === "approved" ? "Approved by DM." : "Denied by DM.",
        dmReply: reply,
        resolvedAt: new Date().toISOString(),
        resolvedById: "dungeon-master",
      },
    });
    branchState.actionLog = [...(Array.isArray(branchState.actionLog) ? branchState.actionLog : []), resolved];

    try {
      await Library.upsert(entry.collection, record);
      applyUpdatedRuntimeRecord(entry.collection, record);
      pushAlert(`${status === "approved" ? "Approved" : "Denied"}: ${entry.title}`, status === "approved" ? "positive" : "negative");
      render(mountedContainer);
      refreshRuntimeData({ forceApi: true, quiet: true }).then(() => {
        if (mountedContainer) render(mountedContainer);
      }).catch((error) => {
        pushAlert(`Background refresh failed after ${status}: ${error.message || String(error)}`, "negative");
        if (mountedContainer) render(mountedContainer);
      });
    } catch (error) {
      pushAlert(`Could not update ${entry.scope}: ${error.message || String(error)}`, "negative");
      render(mountedContainer);
    }
  }

  function collectQueueEntries() {
    return [
      ...(state.context.sessions || []).flatMap((record) => (record.queuedActions || []).map((action) => buildQueueEntry("sessions", "Session", record, action))),
      ...(state.context.encounters || []).flatMap((record) => (record.queuedActions || []).map((action) => buildQueueEntry("encounters", "Encounter", record, action))),
    ].sort((left, right) => String(right.sortAt || "").localeCompare(String(left.sortAt || "")));
  }

  function collectHistoryEntries() {
    return [
      ...(state.context.sessions || []).flatMap((record) => (record.actionLog || []).map((action) => buildHistoryEntry("Session", record, action))),
      ...(state.context.encounters || []).flatMap((record) => (record.actionLog || []).map((action) => buildHistoryEntry("Encounter", record, action))),
    ].sort((left, right) => String(right.sortAt || "").localeCompare(String(left.sortAt || ""))).slice(0, 16);
  }

  function buildQueueEntry(collection, scope, record, action) {
    const hydrated = GameplayRuntime.hydrateAction(action, {});
    return {
      collection,
      scope,
      record,
      action: hydrated,
      title: hydrated.payload?.summary || humanizeActionKind(hydrated.kind),
      meta: [record.name || scope, hydrated.requestedAt ? formatWhen(hydrated.requestedAt) : "", hydrated.actorLabel || hydrated.actorId || ""].filter(Boolean).join(" | "),
      note: hydrated.payload?.note || "",
      tags: [hydrated.kind, ...(hydrated.targetLabels || [])].filter(Boolean),
      sortAt: hydrated.requestedAt || "",
    };
  }

  function buildHistoryEntry(scope, record, action) {
    const hydrated = GameplayRuntime.hydrateAction(action, {});
    return {
      title: hydrated.payload?.summary || humanizeActionKind(hydrated.kind),
      meta: [record.name || scope, hydrated.resolution?.resolvedAt ? formatWhen(hydrated.resolution.resolvedAt) : "", hydrated.actorLabel || hydrated.actorId || ""].filter(Boolean).join(" | "),
      note: hydrated.resolutionText || hydrated.payload?.note || "",
      status: hydrated.status || "logged",
      sortAt: hydrated.resolution?.resolvedAt || hydrated.requestedAt || "",
    };
  }

  function buildInboxEntries(historyEntries = []) {
    const alertEntries = (state.alerts || []).map((entry) => ({
      title: entry.title,
      meta: entry.meta,
      note: entry.note,
      status: entry.status,
      sortAt: entry.sortAt,
    }));

    const recentHistory = historyEntries.slice(0, 8).map((entry) => ({
      ...entry,
      status: entry.status || "logged",
    }));

    return [...alertEntries, ...recentHistory]
      .sort((left, right) => String(right.sortAt || "").localeCompare(String(left.sortAt || "")))
      .slice(0, 12);
  }

  function pushAlert(message, tone = "neutral", persist = true) {
    state.lastNotice = message;
    state.lastNoticeTone = tone;
    const entry = {
      title: tone === "negative" ? "Dungeon Master Alert" : "Dungeon Master Notice",
      meta: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      note: message,
      status: tone === "negative" ? "alert" : "notice",
      sortAt: new Date().toISOString(),
    };
    if (persist) state.alerts = [entry, ...(state.alerts || [])].slice(0, 12);
    ViewCharacterUtils?.showToast?.(message, tone === "negative" ? "error" : "info");
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (!mountedContainer || !state.writable) return;
      try {
        await refreshRuntimeData({ forceApi: true, quiet: true });
        state.lastNotice = "Dungeon master records polled from GitHub.";
        state.lastNoticeTone = "positive";
        render(mountedContainer);
      } catch (error) {
        pushAlert(`Polling failed: ${error.message || String(error)}`, "negative");
        render(mountedContainer);
      }
    }, POLL_INTERVAL_MS);
  }

  function bindAuthListener() {
    if (authListenerBound) return;
    authListenerBound = true;
    window.addEventListener("github-auth-changed", async () => {
      state.writable = typeof GitHub !== "undefined" && GitHub.isConfigured();
      if (mountedContainer) {
        await refreshRuntimeData({ forceApi: state.writable, quiet: true });
        pushAlert(
          state.writable
            ? "GitHub auth is now available in this browser."
            : "GitHub auth was cleared from this browser.",
          state.writable ? "positive" : "negative"
        );
        render(mountedContainer);
        startPolling();
      }
    });
  }

  function isActiveStatus(status = "") {
    return ["active", "open", "pending"].includes(String(status || "").trim().toLowerCase());
  }

  function humanizeActionKind(kind = "") {
    return String(kind || "action")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatWhen(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applyUpdatedRuntimeRecord(collection, record) {
    if (!record?.id) return;
    const key = collection === "encounters" ? "encounters" : "sessions";
    const list = Array.isArray(state.context?.[key]) ? [...state.context[key]] : [];
    const index = list.findIndex((entry) => entry?.id === record.id);
    const runtimeRecord = typeof LibraryRecords !== "undefined" && typeof LibraryRecords.toRuntimeRecord === "function"
      ? LibraryRecords.toRuntimeRecord(record, collection)
      : record;
    if (index >= 0) list[index] = runtimeRecord;
    else list.unshift(runtimeRecord);
    state.context[key] = list;
  }

  return { mount };
})();

if (typeof globalThis !== "undefined") globalThis.DungeonMasterApp = DungeonMasterApp;
