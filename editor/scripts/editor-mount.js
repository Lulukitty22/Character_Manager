/**
 * editor/scripts/editor-mount.js
 * ────────────────────────────────────────────────────────────────────────
 * Single mount seam for the character editor.
 *
 * Both the local manager (app/) and the shareable editor shell
 * (share/editor/index.js) call this entrypoint to render the editor
 * tabs+panels into a container. The seam keeps the two paths in lockstep.
 *
 * API:
 *   const handle = Editor.mount(container, character, options);
 *
 *   handle.getCurrentCharacter()  // harvest current edits into a deep copy
 *   handle.refresh(newCharacter)   // rebuild against a different character
 *   handle.destroy()               // release listeners (best-effort)
 *
 * Options:
 *   onChange    : (character) => void   // debounced, fired on any input change
 *   initialTab  : string                 // tab id to start on (default: first)
 *   tabIds      : string[]               // subset of tab ids to show
 *
 * Layout chrome (header, save buttons, preview pane) is intentionally NOT
 * part of this seam. Callers wrap the mount however they want — the manager
 * uses a stacked editor view; the shareable editor shell uses left-edit +
 * right-live-preview. Both call Editor.mount() to render the actual editor
 * content into their own container.
 *
 * Tab definitions live here so that they're the same set in both contexts.
 * ────────────────────────────────────────────────────────────────────────
 */

const Editor = (() => {

  const ALL_TABS = [
    { id: "base",      icon: "🧾", label: "Identity",  module: "EditorBase"      },
    { id: "dnd",       icon: "⚔️",  label: "D&D Stats", module: "EditorDnd"       },
    { id: "boss",      icon: "💀",  label: "Boss",      module: "EditorBoss"      },
    { id: "gameplay",  icon: "HP", label: "Gameplay",  module: "EditorGameplay"  },
    { id: "spells",    icon: "✨",  label: "Spells",    module: "EditorSpells"    },
    { id: "inventory", icon: "🎒",  label: "Inventory", module: "EditorInventory" },
    { id: "resources", icon: "🔮",  label: "Resources", module: "EditorResources" },
    { id: "roblox",    icon: "🎮",  label: "Roblox",    module: "EditorRoblox"    },
  ];

  function getModule(name) {
    return (typeof window !== "undefined" && window[name]) || (typeof globalThis !== "undefined" && globalThis[name]) || null;
  }

  /**
   * Mount the editor tabs+panels into container. Replaces container's contents.
   * Returns a handle object for harvesting/refreshing/destroying.
   */
  function mount(container, character, options = {}) {
    const opts = {
      onChange: typeof options.onChange === "function" ? options.onChange : null,
      initialTab: options.initialTab || null,
      tabIds: Array.isArray(options.tabIds) ? options.tabIds : null,
    };

    let activeCharacter = character;

    const tabs = ALL_TABS
      .filter(t => !opts.tabIds || opts.tabIds.includes(t.id))
      .filter(t => getModule(t.module));

    if (!tabs.length) {
      container.innerHTML = `<div class="editor-empty">No editor modules loaded.</div>`;
      return { getCurrentCharacter: () => activeCharacter, refresh: () => {}, destroy: () => {} };
    }

    // ─── Render shell ───
    container.innerHTML = `
      <div class="editor-mount">
        <div class="editor-tabs" role="tablist">
          ${tabs.map((tab, i) => `
            <button class="editor-tab ${i === 0 ? "active" : ""}"
                    data-tab-id="${tab.id}" role="tab" type="button">
              ${tab.icon} ${tab.label}
            </button>
          `).join("")}
        </div>
        <div class="editor-tab-panels" data-tab-panels></div>
      </div>
    `;

    const tabBtns = Array.from(container.querySelectorAll(".editor-tab"));
    const panelHost = container.querySelector("[data-tab-panels]");

    // ─── Build panels by calling each module's buildTab(character) ───
    const panels = tabs.map((tab, i) => {
      const mod = getModule(tab.module);
      const panel = mod.buildTab(activeCharacter);
      if (i !== 0) panel.classList.remove("active");
      panelHost.appendChild(panel);
      return { tab, panel, mod };
    });

    // ─── Tab switching ───
    function selectTab(targetId) {
      tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tabId === targetId));
      panels.forEach(({ tab, panel }) => panel.classList.toggle("active", tab.id === targetId));
    }
    tabBtns.forEach(b => b.addEventListener("click", () => selectTab(b.dataset.tabId)));
    if (opts.initialTab) selectTab(opts.initialTab);

    // ─── Debounced change emitter ───
    let changeTimer = null;
    function emitChange() {
      if (!opts.onChange) return;
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => {
        try {
          opts.onChange(getCurrentCharacter());
        } catch (err) {
          // Don't let a downstream error in onChange crash the editor
          console.error("Editor onChange handler threw:", err);
        }
      }, 250);
    }
    function onAnyInput(e) {
      if (e.target.matches("input, textarea, select")) emitChange();
    }
    container.addEventListener("input", onAnyInput);
    container.addEventListener("change", onAnyInput);

    // ─── Public: harvest current state into a fresh copy ───
    function getCurrentCharacter() {
      const fresh = JSON.parse(JSON.stringify(activeCharacter));
      panels.forEach(({ mod }) => {
        try { mod.readTab(fresh); }
        catch (err) { console.error("Editor module readTab threw:", err); }
      });
      return fresh;
    }

    // ─── Public: rebuild against a different character ───
    function refresh(newCharacter) {
      activeCharacter = newCharacter;
      // Remove all panels
      panels.forEach(({ panel }) => panel.remove());
      panels.length = 0;
      // Rebuild
      tabs.forEach((tab, i) => {
        const mod = getModule(tab.module);
        const panel = mod.buildTab(activeCharacter);
        if (i !== 0) panel.classList.remove("active");
        panelHost.appendChild(panel);
        panels.push({ tab, panel, mod });
      });
    }

    // ─── Public: cleanup ───
    function destroy() {
      clearTimeout(changeTimer);
      container.removeEventListener("input", onAnyInput);
      container.removeEventListener("change", onAnyInput);
      container.innerHTML = "";
    }

    return { getCurrentCharacter, refresh, destroy };
  }

  return { mount, ALL_TABS };

})();

if (typeof globalThis !== "undefined") globalThis.Editor = Editor;
