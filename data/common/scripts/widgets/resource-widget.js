const ResourceWidgets = (() => {
  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(resource = {}) {
    const current = Math.max(0, Number(resource.current || 0));
    const max = Math.max(0, Number(resource.max || 0));
    const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0;
    const tone = percent <= 25 ? "danger" : percent <= 50 ? "warn" : "purple";
    return {
      ...resource,
      current,
      max,
      percent,
      tone,
    };
  }

  function toneClass(resource = {}) {
    const state = normalize(resource);
    return state.tone === "danger" ? "danger" : state.tone === "warn" ? "warn" : "purple";
  }

  function renderMiniMeter(resource = {}, options = {}) {
    const state = normalize(resource);
    const className = options.className || `ovh-mini-bar ${toneClass(state)}`;
    return `
      <span class="${escAttr(className)}">
        <i style="width:${state.percent}%"></i>
      </span>
    `;
  }

  function renderTrack(resource = {}, options = {}) {
    const state = normalize(resource);
    const note = options.note || "";
    const title = options.title || resource.name || "Resource";
    const readout = options.readout || `${state.current} / ${state.max}`;
    return `
      <div class="${escAttr(options.wrapperClass || "ovh-resource-track")}" style="${escAttr(options.style || "")}">
        <div class="rname">${esc(title)}${note ? `<span class="meta">${esc(note)}</span>` : ""}</div>
        <div class="ovh-hp-bar-wrap">
          <div class="ovh-hp-bar"><span class="ovh-hp-bar-fill ${escAttr(toneClass(state))}" style="width:${state.percent}%"></span></div>
          <span class="hp-readout">${esc(readout)}</span>
        </div>
      </div>
    `;
  }

  return {
    normalize,
    toneClass,
    renderMiniMeter,
    renderTrack,
  };
})();

if (typeof globalThis !== "undefined") globalThis.ResourceWidgets = ResourceWidgets;
