/**
 * surface-presets.js
 * Shared capability presets for Editor, Character Card, and Session View.
 */

const SurfacePresets = (() => {
  const PRESETS = {
    editor: {
      id: "editor",
      label: "Editor",
      canEditMetadata: true,
      canEditQuantityDirectly: true,
      canUseActions: true,
      canQueueActions: false,
      canViewLogs: true,
      canDirectlyMutateState: true,
      canManageAuth: true,
      isReadOnly: false,
    },
    character_card: {
      id: "character_card",
      label: "Character Card",
      canEditMetadata: false,
      canEditQuantityDirectly: false,
      canUseActions: false,
      canQueueActions: false,
      canViewLogs: true,
      canDirectlyMutateState: false,
      canManageAuth: false,
      isReadOnly: true,
    },
    session_view: {
      id: "session_view",
      label: "Session View",
      canEditMetadata: false,
      canEditQuantityDirectly: false,
      canUseActions: true,
      canQueueActions: true,
      canViewLogs: true,
      canDirectlyMutateState: false,
      canManageAuth: true,
      isReadOnly: false,
    },
  };

  let activePresetId = "character_card";

  function clonePreset(preset = {}) {
    return JSON.parse(JSON.stringify(preset));
  }

  function get(id = "character_card") {
    return clonePreset(PRESETS[id] || PRESETS.character_card);
  }

  function list() {
    return Object.values(PRESETS).map(clonePreset);
  }

  function setActivePreset(id = "character_card") {
    activePresetId = PRESETS[id] ? id : "character_card";
    if (typeof globalThis !== "undefined") {
      globalThis.__ACTIVE_SHEET_SURFACE__ = activePresetId;
    }
    return get(activePresetId);
  }

  function active() {
    return get(activePresetId);
  }

  function resolve(input = null) {
    if (!input) return active();
    if (typeof input === "string") return get(input);
    return {
      ...active(),
      ...(input || {}),
    };
  }

  return {
    list,
    get,
    active,
    resolve,
    setActivePreset,
  };
})();

