const HpWidgets = (() => {
  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(hpState = {}) {
    const current = Math.max(0, Number(hpState.current || 0));
    const max = Math.max(0, Number(hpState.max || 0));
    const temp = Math.max(0, Number(hpState.temp || 0));
    const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
    const tone = percent <= 25 ? "danger" : percent <= 50 ? "warn" : "ok";
    return { current, max, temp, percent, tone };
  }

  function fillClass(tone = "ok", variant = "ovh") {
    if (variant === "ovh") {
      return tone === "danger" ? "danger" : tone === "warn" ? "warn" : "";
    }
    return tone === "danger" ? "low" : tone === "warn" ? "medium" : "";
  }

  function formatReadout(hpState, options = {}) {
    const state = normalize(hpState);
    const showTemp = options.showTemp !== false;
    const suffix = options.suffix ? ` ${options.suffix}` : "";
    return `${state.current} / ${state.max}${showTemp && state.temp ? ` + ${state.temp} temp` : ""}${suffix}`;
  }

  function renderBar(hpState, options = {}) {
    const state = normalize(hpState);
    const variant = options.variant || "ovh";
    const wrapperClass = options.wrapperClass || "ovh-hp-bar-wrap";
    const trackClass = options.trackClass || "ovh-hp-bar";
    const fillClassBase = options.fillClassBase || "ovh-hp-bar-fill";
    const fillTag = options.fillTag || "span";
    const readout = options.readout === false
      ? ""
      : `<span class="${escAttr(options.readoutClass || "hp-readout")}">${esc(options.readoutText || formatReadout(state, options))}</span>`;
    const toneClass = fillClass(state.tone, variant);
    const fillClassName = [fillClassBase, toneClass, options.extraFillClass || ""].filter(Boolean).join(" ");

    const wrapperAttr = wrapperClass ? ` class="${escAttr(wrapperClass)}"` : "";
    return `
      <div${wrapperAttr}>
        <div class="${escAttr(trackClass)}">
          <${fillTag} class="${escAttr(fillClassName)}" style="width:${state.percent}%"></${fillTag}>
        </div>
        ${readout}
      </div>
    `;
  }

  function applyFillState(fillEl, hpState, options = {}) {
    if (!fillEl) return normalize(hpState);
    const state = normalize(hpState);
    const variant = options.variant || "editor";
    const fillClassBase = options.fillClassBase || "hp-bar-fill";
    const toneClass = fillClass(state.tone, variant);
    fillEl.style.width = `${state.percent}%`;
    fillEl.className = [fillClassBase, toneClass, options.extraFillClass || ""].filter(Boolean).join(" ");
    return state;
  }

  return {
    normalize,
    fillClass,
    formatReadout,
    renderBar,
    applyFillState,
  };
})();

if (typeof globalThis !== "undefined") globalThis.HpWidgets = HpWidgets;
