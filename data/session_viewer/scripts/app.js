const SessionViewerApp = (() => {
  const POLL_INTERVAL_MS = 10000;
  const state = {
    character: null,
    bootConfig: null,
    context: { party: null, session: null, encounter: null },
    lastNotice: "",
    lastNoticeTone: "neutral",
    alerts: [],
    writable: false,
    activeSheetTab: "identity",
  };
  let pollTimer = null;
  let mountedContainer = null;
  let authListenerBound = false;

  async function mount(container, characterData, bootConfig = {}) {
    mountedContainer = container;
    state.character = Schema.applyDefaults(characterData || {});
    state.bootConfig = bootConfig || {};
    state.lastNotice = "";
    state.lastNoticeTone = "neutral";
    state.alerts = [];
    state.writable = typeof GitHub !== "undefined" && GitHub.isConfigured();
    if (typeof SurfacePresets !== "undefined") SurfacePresets.setActivePreset("session_view");
    if (typeof globalThis !== "undefined") {
      globalThis.__SESSION_VIEW_BRIDGE__ = {
        queueGameplayAction: (draft) => queueGameplayActionDraft(draft, mountedContainer),
        openAuth: () => GitHubAuthWidget?.open?.(),
      };
    }
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
        const repoPath = state.character?.meta?.repoPath || state.bootConfig?.characterPath || "";
        if (repoPath) {
          const latest = await GitHub.readCharacterFile(repoPath);
          state.character = Schema.applyDefaults(latest.data || {});
        }
      } catch (error) {
        if (!quiet) {
          pushAlert(`Refresh fell back to cached data: ${error.message || String(error)}`, "negative");
        }
      }
    }

    state.context = GameplayRuntime.findActiveContext(state.character);
    state.writable = typeof GitHub !== "undefined" && GitHub.isConfigured();
  }

  function render(container) {
    state.activeSheetTab = readActiveSheetTab(container) || state.activeSheetTab || "identity";
    const context = state.context || {};
    const suggestions = buildSuggestions(state.character, context);
    const personalQueue = buildPersonalQueue(context);
    const personalHistory = buildPersonalHistory(context);
    const inboxEntries = buildInboxEntries(personalQueue, personalHistory);

    container.innerHTML = `
      <div class="player-shell">
        <header class="player-topbar">
          <div class="player-topbar-inner">
            <div class="player-topbar-copy">
              <div class="player-kicker">Session View</div>
              <div class="player-title-row">
                <h1>${escapeHTML(state.character?.identity?.name || "Character")}</h1>
                <span class="badge badge-accent">${escapeHTML(context.session?.name || "No active session")}</span>
              </div>
            </div>
            <div class="player-topbar-actions">
              <button class="button button-ghost button-sm" id="btn-player-auth">GitHub</button>
              <button class="button button-ghost button-sm" id="btn-player-refresh">Refresh</button>
              <button class="button button-primary button-sm" id="btn-player-reload-sheet">Reload Context</button>
            </div>
          </div>
        </header>

        <div class="player-content">
          <section class="player-sheet-pane">
            <div class="player-sheet-wrap">
              <div id="player-sheet-host"></div>
            </div>
          </section>

          <aside class="player-side-pane">
            ${renderBanner()}
            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>Session Summary</h2>
                  <div class="text-muted text-sm">Party/session routing, authority, and sync state.</div>
                </div>
              </div>
              ${renderContextSummary(context)}
            </section>

            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>Session Inbox</h2>
                  <div class="text-muted text-sm">DM replies, system alerts, and the most important queue/history events.</div>
                </div>
              </div>
              ${renderInbox(inboxEntries)}
            </section>

            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>Manual Request Composer</h2>
                  <div class="text-muted text-sm">For custom requests that are broader than the one-click sheet actions.</div>
                </div>
              </div>
              ${renderComposer(context)}
            </section>

            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>Quick Suggestions</h2>
                  <div class="text-muted text-sm">Fast-fill common requests from the current sheet state.</div>
                </div>
              </div>
              ${renderSuggestions(suggestions)}
            </section>

            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>My Queue</h2>
                  <div class="text-muted text-sm">Outstanding requests involving this character.</div>
                </div>
              </div>
              ${renderActionList(personalQueue, "No queued requests for this character yet.")}
            </section>

            <section class="player-card">
              <div class="player-card-header">
                <div class="player-card-copy">
                  <h2>History</h2>
                  <div class="text-muted text-sm">Approved, denied, or applied actions involving this character.</div>
                </div>
              </div>
              ${renderActionList(personalHistory, "No history yet.")}
            </section>
          </aside>
        </div>
      </div>
    `;

    const sheetHost = container.querySelector("#player-sheet-host");
    if (sheetHost) {
      ViewCharacter.mount(sheetHost, state.character, {
        activeTab: state.activeSheetTab,
        onTabChange: (tabId) => { state.activeSheetTab = tabId || state.activeSheetTab; },
      });
    }

    wire(container);
  }

  function renderBanner() {
    if (!state.writable) {
      return `
        <section class="player-banner is-limited">
          <div class="player-banner-title">Read-only right now</div>
          <div class="text-muted text-sm">This Session View can still read the latest sheet from GitHub, but queue submission needs a GitHub PAT saved in this browser.</div>
        </section>
      `;
    }

    if (state.lastNotice) {
      return `
        <section class="player-banner ${state.lastNoticeTone === "negative" ? "is-error" : "is-ready"}">
          <div class="player-banner-title">${escapeHTML(state.lastNoticeTone === "negative" ? "Heads up" : "Synced")}</div>
          <div class="text-muted text-sm">${escapeHTML(state.lastNotice)}</div>
        </section>
      `;
    }

    return `
      <section class="player-banner is-ready">
        <div class="player-banner-title">Ready to queue</div>
        <div class="text-muted text-sm">GitHub auth is present in this browser, so queued requests can sync into the shared session records and poll roughly every 10 seconds.</div>
      </section>
    `;
  }

  function renderContextSummary(context = {}) {
    const chips = [];
    if (context.party) chips.push(chip("Party", context.party.name));
    if (context.session) chips.push(chip("Session", `${context.session.name} (${context.session.mode || "session_utility"})`));
    if (context.encounter) chips.push(chip("Encounter", `${context.encounter.name} (Round ${context.encounter.round || 0})`));

    return `
      <div class="player-grid">
        <div class="player-chip-row">${chips.join("") || chip("Status", "No linked party/session yet")}</div>
        <div class="player-grid two-up">
          <div class="player-action-row">
            <div class="player-section-label">Routing</div>
            <div class="text-muted text-sm">Session utility requests land on the session log. Encounter requests land on the active encounter log.</div>
          </div>
          <div class="player-action-row">
            <div class="player-section-label">Authority</div>
            <div class="text-muted text-sm">Session View queues intent only. The DM reply and resulting deltas record what actually happened.</div>
          </div>
          <div class="player-action-row">
            <div class="player-section-label">Sync</div>
            <div class="text-muted text-sm">GitHub is the canonical backend in v1. Manual refresh stays available, and authenticated runtime polling targets a 10-second cadence.</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderInbox(entries = []) {
    if (!entries.length) {
      return `<div class="player-empty">No inbox events yet. Once requests start moving, approvals, denials, and sync alerts will surface here.</div>`;
    }
    return `
      <div class="player-card-list">
        ${entries.map((entry) => `
          <div class="player-action-row">
            <div class="player-action-topline">
              <div>
                <div class="player-action-title">${escapeHTML(entry.title)}</div>
                <div class="player-action-meta">${escapeHTML(entry.meta)}</div>
              </div>
              <span class="player-status is-${escapeAttr(entry.statusTone)}">${escapeHTML(entry.status)}</span>
            </div>
            ${entry.note ? `<div class="player-action-note">${escapeHTML(entry.note)}</div>` : ""}
            <div class="player-action-tags">
              ${entry.tags.map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderComposer(context = {}) {
    const targetOptions = buildTargetOptions(context);
    const canQueue = Boolean(state.writable && (context.session || context.encounter));
    const modeOptions = [
      { value: "session_utility", label: "Session Utility", disabled: !context.session },
      { value: "encounter", label: "Encounter", disabled: !context.encounter },
    ];

    return `
      <form id="player-action-form" class="player-grid">
        <div class="player-grid two-up">
          <div class="player-field">
            <label for="player-action-mode">Route</label>
            <select id="player-action-mode" class="player-select">
              ${modeOptions.map(option => `
                <option value="${escapeAttr(option.value)}" ${option.disabled ? "disabled" : ""} ${option.value === (context.encounter ? "encounter" : "session_utility") ? "selected" : ""}>
                  ${escapeHTML(option.label)}
                </option>
              `).join("")}
            </select>
          </div>
          <div class="player-field">
            <label for="player-action-kind">Kind</label>
            <select id="player-action-kind" class="player-select">
              <option value="utility">Utility</option>
              <option value="craft">Craft</option>
              <option value="consume_item">Consume Item</option>
              <option value="ready_ammo">Ready Ammo</option>
              <option value="stow_ammo">Stow Ammo</option>
              <option value="attack">Attack</option>
              <option value="check">Check</option>
              <option value="save_request">Save Request</option>
              <option value="short_rest">Short Rest</option>
              <option value="long_rest">Long Rest</option>
            </select>
          </div>
        </div>

        <div class="player-field">
          <label for="player-action-summary">Summary</label>
          <input id="player-action-summary" class="player-input" placeholder="What are you trying to do?" />
        </div>

        <div class="player-grid two-up">
          <div class="player-field">
            <label for="player-action-target">Target</label>
            <select id="player-action-target" class="player-select">
              <option value="">No explicit target</option>
              ${targetOptions.map(option => `<option value="${escapeAttr(option.id)}">${escapeHTML(option.label)}</option>`).join("")}
            </select>
          </div>
          <div class="player-field">
            <label for="player-action-item-ref">Item / Record Ref</label>
            <input id="player-action-item-ref" class="player-input" placeholder="Optional, e.g. items.wondrous.quiver.field_quiver" />
          </div>
        </div>

        <div class="player-field">
          <label for="player-action-note">Details for the DM</label>
          <textarea id="player-action-note" class="player-textarea" placeholder="Optional details, assumptions, or table note."></textarea>
        </div>

        <div class="player-chip-row">
          <button type="submit" class="button button-primary" ${canQueue ? "" : "disabled"}>Queue Request</button>
          <button type="button" id="player-clear-draft" class="button button-ghost">Clear Draft</button>
        </div>
      </form>
    `;
  }

  function renderSuggestions(suggestions = []) {
    if (!suggestions.length) {
      return `<div class="player-empty">No quick suggestions yet. As the gameplay model grows, this panel can prefill more of the table flow for you.</div>`;
    }

    return `
      <div class="player-card-list">
        ${suggestions.map((suggestion, index) => `
          <div class="player-suggestion-row">
            <div class="player-action-title">${escapeHTML(suggestion.title)}</div>
            <div class="player-suggestion-meta">
              <span>${escapeHTML(suggestion.kind)}</span>
              <span>${escapeHTML(suggestion.modeLabel)}</span>
              ${suggestion.meta ? `<span>${escapeHTML(suggestion.meta)}</span>` : ""}
            </div>
            ${suggestion.note ? `<div class="text-muted text-sm">${escapeHTML(suggestion.note)}</div>` : ""}
            <div><button class="button button-ghost button-sm btn-player-use-suggestion" data-suggestion-index="${index}">Fill Draft</button></div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderActionList(actions = [], emptyMessage = "Nothing here yet.") {
    if (!actions.length) return `<div class="player-empty">${escapeHTML(emptyMessage)}</div>`;

    return `
      <div class="player-card-list">
        ${actions.map((entry) => `
          <div class="player-action-row">
            <div class="player-action-topline">
              <div>
                <div class="player-action-title">${escapeHTML(entry.title)}</div>
                <div class="player-action-meta">${escapeHTML(entry.meta)}</div>
              </div>
              <span class="player-status is-${escapeAttr(entry.statusTone)}">${escapeHTML(entry.status)}</span>
            </div>
            ${entry.note ? `<div class="player-action-note">${escapeHTML(entry.note)}</div>` : ""}
            <div class="player-action-tags">
              ${entry.tags.map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function wire(container) {
    container.querySelector("#btn-player-auth")?.addEventListener("click", () => GitHubAuthWidget?.open?.());

    container.querySelector("#btn-player-refresh")?.addEventListener("click", async () => {
      state.lastNotice = "Refreshing context...";
      state.lastNoticeTone = "neutral";
      render(container);
      await refreshRuntimeData({ forceApi: state.writable, quiet: false });
      if (!state.lastNotice || state.lastNoticeTone !== "negative") {
        state.lastNotice = state.writable
          ? "Context refreshed from GitHub."
          : "Refreshed using the currently loaded read-only data.";
        state.lastNoticeTone = "positive";
        pushAlert(state.lastNotice, "positive", false);
      }
      render(container);
    });

    container.querySelector("#btn-player-reload-sheet")?.addEventListener("click", async () => {
      await refreshRuntimeData({ forceApi: state.writable, quiet: false });
      if (!state.lastNotice || state.lastNoticeTone !== "negative") {
        state.lastNotice = state.writable
          ? "Pulled the latest sheet + gameplay records from GitHub."
          : "Reloaded the current sheet snapshot. Saving still needs GitHub auth in this browser.";
        state.lastNoticeTone = "positive";
        pushAlert(state.lastNotice, "positive", false);
      }
      render(container);
    });

    container.querySelectorAll(".btn-player-use-suggestion").forEach((button) => {
      button.addEventListener("click", () => {
        const suggestion = buildSuggestions(state.character, state.context)[Number(button.dataset.suggestionIndex || -1)];
        if (!suggestion) return;
        fillDraft(container, suggestion);
      });
    });

    container.querySelector("#player-clear-draft")?.addEventListener("click", () => clearDraft(container));

    container.querySelector("#player-action-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await submitDraft(container);
    });
  }

  function fillDraft(container, suggestion) {
    container.querySelector("#player-action-mode").value = suggestion.mode;
    container.querySelector("#player-action-kind").value = suggestion.kind;
    container.querySelector("#player-action-summary").value = suggestion.summary || suggestion.title;
    container.querySelector("#player-action-note").value = suggestion.note || "";
    container.querySelector("#player-action-item-ref").value = suggestion.itemRef || "";
    const target = container.querySelector("#player-action-target");
    if (target && suggestion.targetId && Array.from(target.options).some(option => option.value === suggestion.targetId)) {
      target.value = suggestion.targetId;
    } else if (target) {
      target.value = "";
    }
  }

  function clearDraft(container) {
    container.querySelector("#player-action-summary").value = "";
    container.querySelector("#player-action-note").value = "";
    container.querySelector("#player-action-item-ref").value = "";
    const target = container.querySelector("#player-action-target");
    if (target) target.value = "";
  }

  async function submitDraft(container) {
    const context = state.context || {};
    if (!state.writable) {
      pushAlert("Queue submission needs a GitHub PAT saved in this browser first.", "negative");
      render(container);
      GitHubAuthWidget?.open?.();
      return;
    }

    const mode = container.querySelector("#player-action-mode")?.value || "session_utility";
    const kind = container.querySelector("#player-action-kind")?.value || "utility";
    const summary = container.querySelector("#player-action-summary")?.value.trim() || "";
    const note = container.querySelector("#player-action-note")?.value.trim() || "";
    const itemRef = container.querySelector("#player-action-item-ref")?.value.trim() || "";
    const targetId = container.querySelector("#player-action-target")?.value.trim() || "";

    if (!summary) {
      pushAlert("Give the DM at least a one-line summary of what you want to do.", "negative");
      render(container);
      return;
    }

    const destination = resolveDestinationRecord(mode, context);
    if (!destination) {
      pushAlert(mode === "encounter"
        ? "There is no active encounter record linked to this character yet."
        : "There is no active session record linked to this character yet.", "negative");
      render(container);
      return;
    }

    const action = Schema.createGameplayActionRequest({
      kind,
      mode,
      actorId: state.character.id,
      requestedById: state.character.id,
      targetIds: targetId ? [targetId] : [],
      payload: {
        summary,
        note,
        itemRef,
      },
      audit: {
        sourceSurface: "session_view",
        sourceSurfaceVersion: "v1",
      },
    });

    const recordClone = JSON.parse(JSON.stringify(destination.record));
    GameplayRuntime.queueAction(recordClone, destination.collection, action);
    if (destination.branch === "session") {
      recordClone.features.session.poll = {
        ...(recordClone.features.session.poll || {}),
        lastSyncedAt: new Date().toISOString(),
      };
    } else {
      recordClone.features.encounter.dm = {
        ...(recordClone.features.encounter.dm || {}),
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    try {
      await Library.upsert(destination.collection, recordClone);
      applyUpdatedRuntimeRecord(destination.collection, recordClone);
      pushAlert("Request queued and synced to GitHub.", "positive");
      render(container);
      refreshRuntimeData({ forceApi: true, quiet: true }).then(() => {
        if (mountedContainer) render(mountedContainer);
      }).catch(() => {});
    } catch (error) {
      pushAlert(`Could not queue request: ${error.message || String(error)}`, "negative");
      render(container);
    }
  }

  async function queueGameplayActionDraft(draft = {}, container = mountedContainer) {
    if (!container) return;
    const context = state.context || {};
    if (!state.writable) {
      pushAlert("Queue submission needs GitHub auth in this browser first.", "negative");
      render(container);
      GitHubAuthWidget?.open?.();
      return;
    }

    const mode = draft.mode || (draft.kind === "attack" ? "encounter" : "session_utility");
    const destination = resolveDestinationRecord(mode, context);
    if (!destination) {
      pushAlert(mode === "encounter"
        ? "There is no active encounter record linked to this character yet."
        : "There is no active session record linked to this character yet.", "negative");
      render(container);
      return;
    }

    const action = Schema.createGameplayActionRequest({
      kind: draft.kind || "utility",
      mode,
      actorId: state.character.id,
      requestedById: state.character.id,
      targetIds: Array.isArray(draft.targetIds) ? draft.targetIds : (draft.targetId ? [draft.targetId] : []),
      payload: {
        summary: draft.summary || humanizeActionKind(draft.kind || "utility"),
        note: draft.note || "",
        itemRef: draft.itemRef || "",
        ...(draft.payload || {}),
      },
      audit: {
        sourceSurface: "session_view",
        sourceSurfaceVersion: "v1",
      },
    });

    const recordClone = JSON.parse(JSON.stringify(destination.record));
    GameplayRuntime.queueAction(recordClone, destination.collection, action);
    if (destination.branch === "session") {
      recordClone.features.session.poll = {
        ...(recordClone.features.session.poll || {}),
        refreshMs: POLL_INTERVAL_MS,
        lastSyncedAt: new Date().toISOString(),
      };
    } else {
      recordClone.features.encounter.dm = {
        ...(recordClone.features.encounter.dm || {}),
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    try {
      await Library.upsert(destination.collection, recordClone);
      applyUpdatedRuntimeRecord(destination.collection, recordClone);
      pushAlert(`Queued: ${draft.summary || humanizeActionKind(draft.kind || "utility")}`, "positive");
      render(container);
      refreshRuntimeData({ forceApi: true, quiet: true }).then(() => {
        if (mountedContainer) render(mountedContainer);
      }).catch(() => {});
    } catch (error) {
      pushAlert(`Could not queue request: ${error.message || String(error)}`, "negative");
      render(container);
    }
  }

  function resolveDestinationRecord(mode, context = {}) {
    if (mode === "encounter" && context.encounter) {
      return { collection: "encounters", branch: "encounter", record: context.encounter };
    }
    if (context.session) {
      return { collection: "sessions", branch: "session", record: context.session };
    }
    if (context.encounter) {
      return { collection: "encounters", branch: "encounter", record: context.encounter };
    }
    return null;
  }

  function buildSuggestions(character = {}, context = {}) {
    const suggestions = [];
    const encounterTarget = (context.encounter?.participants || []).find((participant) => String(participant.id || "") !== String(character.id || ""));

    DndCalculations.getActionableItems(character).forEach((item) => {
      const action = item.action || {};
      const kind = classifySuggestionKind(item, action);
      const mode = kind === "attack" ? "encounter" : "session_utility";
      suggestions.push({
        title: `${action.label || "Use"} ${item.name || "Item"}`,
        summary: `${action.label || "Use"} ${item.name || "item"}`,
        note: action.description || "",
        kind,
        mode,
        modeLabel: mode === "encounter" ? "Encounter" : "Session Utility",
        itemRef: item.libraryRef || item.id || "",
        targetId: kind === "attack" ? encounterTarget?.id || "" : "",
        meta: buildSuggestionMeta(character, item),
      });
    });

    suggestions.push({
      title: "Short Rest",
      summary: "Take a short rest and recover what the DM allows.",
      note: "Use this to queue hit-dice spending, recharge checks, or short-rest item recovery.",
      kind: "short_rest",
      mode: "session_utility",
      modeLabel: "Session Utility",
      itemRef: "",
      targetId: "",
      meta: "Downtime / recovery",
    });

    suggestions.push({
      title: "Long Rest",
      summary: "Take a long rest and restore the character state the DM approves.",
      note: "Use this for overnight resets, spell-slot recovery, and rest-driven preparation.",
      kind: "long_rest",
      mode: "session_utility",
      modeLabel: "Session Utility",
      itemRef: "",
      targetId: "",
      meta: "Downtime / recovery",
    });

    return suggestions;
  }

  function classifySuggestionKind(item = {}, action = {}) {
    const label = String(action.label || "").toLowerCase();
    const description = String(action.description || item.description || "").toLowerCase();
    if (label.includes("ready")) return "ready_ammo";
    if (label.includes("stow")) return "stow_ammo";
    if (label.includes("shoot") || label.includes("attack") || item.type === "weapon") return "attack";
    if (action.effects?.heal || action.effects?.tempHp) return "consume_item";
    if (description.includes("craft") || description.includes("brew")) return "craft";
    return "utility";
  }

  function buildSuggestionMeta(character = {}, item = {}) {
    const parts = [];
    if (item.type) parts.push(item.type);
    if (item.quantity != null) parts.push(`x${Number(item.quantity || 0)}`);
    const evaluation = DndCalculations.evaluateItemActionState(character, item);
    if (!evaluation.ok && evaluation.message) parts.push(evaluation.message);
    return parts.join(" | ");
  }

  function buildPersonalQueue(context = {}) {
    const actorId = state.character?.id || "";
    const queued = [
      ...GameplayRuntime.actionsForActor(context.session?.queuedActions || [], actorId).map((action) => ({ source: context.session, scope: "session", action })),
      ...GameplayRuntime.actionsForActor(context.encounter?.queuedActions || [], actorId).map((action) => ({ source: context.encounter, scope: "encounter", action })),
    ];

    return queued
      .map((entry) => buildRenderableAction(entry.action, entry.scope, entry.source))
      .sort((left, right) => String(right.sortAt).localeCompare(String(left.sortAt)));
  }

  function buildPersonalHistory(context = {}) {
    const actorId = state.character?.id || "";
    const logged = [
      ...GameplayRuntime.actionsForActor(context.session?.actionLog || [], actorId).map((action) => ({ source: context.session, scope: "session", action })),
      ...GameplayRuntime.actionsForActor(context.encounter?.actionLog || [], actorId).map((action) => ({ source: context.encounter, scope: "encounter", action })),
    ];

    return logged
      .map((entry) => buildRenderableAction(entry.action, entry.scope, entry.source))
      .sort((left, right) => String(right.sortAt).localeCompare(String(left.sortAt)));
  }

  function buildInboxEntries(personalQueue = [], personalHistory = []) {
    const alertEntries = state.alerts.map((alert) => ({
      title: alert.title,
      meta: alert.meta,
      note: alert.note,
      status: alert.status,
      statusTone: alert.statusTone,
      tags: alert.tags,
      sortAt: alert.sortAt,
    }));

    const dmReplies = personalHistory
      .filter((entry) => entry.note)
      .slice(0, 5)
      .map((entry) => ({
        title: entry.title,
        meta: entry.meta,
        note: entry.note,
        status: entry.status,
        statusTone: entry.statusTone,
        tags: ["dm reply", ...entry.tags].slice(0, 4),
        sortAt: entry.sortAt,
      }));

    const queued = personalQueue.slice(0, 5).map((entry) => ({
      ...entry,
      tags: ["queued", ...entry.tags].slice(0, 4),
    }));

    return [...alertEntries, ...dmReplies, ...queued]
      .sort((left, right) => String(right.sortAt || "").localeCompare(String(left.sortAt || "")))
      .slice(0, 10);
  }

  function pushAlert(message, tone = "neutral", persist = true) {
    state.lastNotice = message;
    state.lastNoticeTone = tone;
    const entry = {
      title: tone === "negative" ? "System Alert" : "Session Notice",
      meta: `${state.context.session?.name || "Session"} | ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      note: message,
      status: tone === "negative" ? "Alert" : "Notice",
      statusTone: tone === "negative" ? "negative" : "positive",
      tags: [tone === "negative" ? "sync" : "session"],
      sortAt: new Date().toISOString(),
    };
    if (persist) {
      state.alerts = [entry, ...(state.alerts || [])].slice(0, 12);
    }
    ViewCharacterUtils?.showToast?.(message, tone === "negative" ? "error" : "info");
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      if (!mountedContainer || !state.writable) return;
      try {
        await refreshRuntimeData({ forceApi: true, quiet: true });
        state.lastNotice = "Session records polled from GitHub.";
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
        if (state.writable) pushAlert("GitHub auth is now available in this browser.", "positive");
        else pushAlert("GitHub auth was cleared from this browser.", "negative");
        render(mountedContainer);
        startPolling();
      }
    });
  }

  function buildRenderableAction(action, scope, sourceRecord) {
    const hydrated = GameplayRuntime.hydrateAction(action, {
      character: state.character,
      party: state.context.party,
      encounter: state.context.encounter,
    });
    const summary = hydrated.payload?.summary || humanizeActionKind(hydrated.kind);
    const targetText = hydrated.targetLabels?.length ? ` -> ${hydrated.targetLabels.join(", ")}` : "";
    const meta = [
      sourceRecord?.name || scope,
      hydrated.mode || scope,
      hydrated.requestedAt ? formatWhen(hydrated.requestedAt) : "",
    ].filter(Boolean).join(" | ");
    const tags = [
      hydrated.kind,
      ...(hydrated.targetLabels?.length ? hydrated.targetLabels : []),
      hydrated.roll?.result?.outcome || "",
    ].filter(Boolean);

    return {
      title: `${summary}${targetText}`,
      meta,
      note: hydrated.resolutionText || hydrated.payload?.note || "",
      status: hydrated.status || "queued",
      statusTone: hydrated.statusTone || "neutral",
      tags,
      sortAt: hydrated.resolution?.resolvedAt || hydrated.requestedAt || "",
    };
  }

  function buildTargetOptions(context = {}) {
    const map = new Map();
    (context.party?.members || []).forEach((member) => {
      const actor = member.actor || member;
      if (!actor?.id) return;
      map.set(actor.id, actor.label || actor.id);
    });
    (context.encounter?.participants || []).forEach((participant) => {
      if (!participant?.id) return;
      map.set(participant.id, participant.label || participant.id);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }

  function chip(label, value) {
    return `<span class="player-chip"><strong>${escapeHTML(label)}</strong><span>${escapeHTML(value)}</span></span>`;
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

  function escapeAttr(text) {
    return escapeHTML(text).replace(/`/g, "&#96;");
  }

  function readActiveSheetTab(container) {
    return container?.querySelector?.("#player-sheet-host .ovh-tab.active")?.getAttribute("data-ovh-tab")
      || container?.querySelector?.("#player-sheet-host .ovh-panel.active")?.getAttribute("data-ovh-panel")
      || "";
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
    if (key === "sessions" && state.context.session?.id === runtimeRecord.id) {
      state.context.session = runtimeRecord;
    }
    if (key === "encounters" && state.context.encounter?.id === runtimeRecord.id) {
      state.context.encounter = runtimeRecord;
    }
  }

  return { mount };
})();

if (typeof globalThis !== "undefined") globalThis.SessionViewerApp = SessionViewerApp;
