const SpellSlotWidgets = (() => {
  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(slot = {}) {
    const current = Math.max(0, Number(slot.current || 0));
    const max = Math.max(0, Number(slot.max || 0));
    const calculatedMax = Math.max(0, Number(slot.calculatedMax || 0));
    const overrideMax = Math.max(0, Number(slot.overrideMax || 0));
    const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
    const tone = percent <= 25 ? "danger" : percent <= 50 ? "warn" : "ok";
    return { current, max, calculatedMax, overrideMax, percent, tone };
  }

  function renderCount(current, max, options = {}) {
    const state = normalize({ current, max });
    const toneClass = state.tone === "danger" ? " danger" : state.tone === "warn" ? " warn" : "";
    const suffix = options.suffix || "slots";
    return `<span class="${escAttr(options.className || `count${toneClass}`)}" title="${state.current}/${state.max} ${suffix}">${state.current} / ${state.max} ${esc(suffix)}</span>`;
  }

  function renderEditorRow(level, slot = {}, options = {}) {
    const state = normalize(slot);
    const unavailable = options.unavailable ?? (state.max <= 0);
    return `
      <div class="spell-slot-row" data-slot-level="${level}">
        <span class="spell-slot-level">Lv ${level}</span>
        <div class="spell-slot-inputs">
          <input type="number" min="0" max="20" class="field-input field-number gp-spell-slot-current" data-level="${level}" value="${state.current}" title="Current slots" />
          <span class="text-muted">/</span>
          <input type="number" min="0" max="20" class="field-input field-number gp-spell-slot-max" data-level="${level}" value="${state.overrideMax || state.max}" data-calculated-max="${state.calculatedMax}" ${options.overrideActive ? "" : "readonly"} title="Max slots" />
        </div>
        ${state.calculatedMax ? `<span class="text-faint text-xs">Calc ${state.calculatedMax}</span>` : ""}
        <div class="flex gap-2">
          <button class="button button-ghost button-sm btn-slot-use" ${unavailable ? "disabled" : ""}>Use</button>
          <button class="button button-ghost button-sm btn-slot-restore" ${unavailable ? "disabled" : ""}>Restore</button>
        </div>
      </div>
    `;
  }

  return {
    normalize,
    renderCount,
    renderEditorRow,
  };
})();

if (typeof globalThis !== "undefined") globalThis.SpellSlotWidgets = SpellSlotWidgets;
