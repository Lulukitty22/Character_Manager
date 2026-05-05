/**
 * view-character-resources.js
 * HP log and custom resource rendering.
 */

const ViewCharacterResources = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderOvhChips = ViewCharacterUtils.renderOvhChips;

  function render(character, customResources) {
    const dnd = character?.dnd || null;
    const resources = customResources || [];
    const hasHp = Boolean(dnd?.hp);
    if (!hasHp && !resources.length) return "";

    const hpState = character && typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : (dnd?.hp || { current: 0, max: 0, temp: 0, log: [] });

    return `
      <section class="ovh-section ovh-resources-section">
        <div class="ovh-section-header">
          <h2>Resources</h2>
          <div class="ovh-section-divider"><svg viewBox="0 0 600 14" preserveAspectRatio="none"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg></div>
        </div>
        ${hasHp ? renderHpBlock(hpState, dnd?.hp?.log || []) : ""}
        ${resources.length ? renderCustomResources(resources) : ""}
      </section>
    `;
  }

  function renderHpBlock(hpState, hpLog) {
    const max = Number(hpState.max || 0);
    const current = Number(hpState.current || 0);
    const temp = Number(hpState.temp || 0);
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const chips = [
      { label: "Current", value: current, kind: "quantity" },
      { label: "Max", value: max, kind: "quantity" },
      temp ? { label: "Temp", value: temp, kind: "positive", description: "Temporary HP absorbs damage before regular HP." } : null,
      { label: "Long Rest", value: "Full", kind: "rest", description: "Long rest restores HP and spell slots in the current gameplay model." },
    ].filter(Boolean);

    return `
      <div class="ovh-record-group">
        <p class="ovh-group-label">
          <span>Hit Points</span>
          <span class="ovh-group-meter">
            <span class="ovh-mini-bar ${pct <= 25 ? "danger" : pct <= 50 ? "warn" : ""}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>
            <span class="count">${current} / ${max}</span>
          </span>
        </p>
        <div class="ovh-card ovh-resource-card">
          <div class="ovh-resource-track">
            <div class="rname">Hit Points<span class="meta">Calculated HP pool</span></div>
            <div class="ovh-hp-bar-wrap">
              <div class="ovh-hp-bar"><span class="ovh-hp-bar-fill ${pct <= 25 ? "danger" : pct <= 50 ? "warn" : ""}" style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>
              <span class="hp-readout">${current} / ${max}${temp ? ` + ${temp} temp` : ""}</span>
            </div>
            ${renderOvhChips(chips, { className: "ovh-chips quick-chips" })}
          </div>
          ${hpLog.length ? renderLogDetails("HP History", `${hpLog.length} entr${hpLog.length === 1 ? "y" : "ies"}`, hpLog) : ""}
        </div>
      </div>
    `;
  }

  function renderCustomResources(resources) {
    return `
      <div class="ovh-record-group">
        <p class="ovh-group-label">
          <span>Tracked Resources</span>
          <span class="count">${resources.length}</span>
        </p>
        ${resources.map(renderResourceBlock).join("")}
      </div>
    `;
  }

  function renderResourceBlock(resource) {
    const max = Number(resource.max || 0);
    const current = Number(resource.current || 0);
    const pct = max > 0 ? Math.round((current / max) * 100) : 0;
    const mechanics = [
      { label: "Current", value: current, kind: "quantity" },
      { label: "Max", value: max, kind: "quantity" },
      ...(resource.addons?.mechanics || []),
    ];
    const subtitle = resource.description || (resource.source === "library" ? "Library resource" : "Custom resource");

    return `
      <details class="ovh-record ovh-resource-record sheet-record-card" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildResourceViewerRecord(resource, mechanics))}" open>
        <summary>
          <div class="title-block">
            <div class="title">
              ${esc(resource.name || "Resource")}
              <span class="sub">${esc(subtitle || "")}</span>
            </div>
            ${renderOvhChips(mechanics, { className: "ovh-chips quick-chips" })}
          </div>
          <span class="ovh-group-meter">
            <span class="ovh-mini-bar purple ${pct <= 25 ? "danger" : pct <= 50 ? "warn" : ""}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></span>
            <span class="count">${current} / ${max}</span>
          </span>
          <button type="button" class="ovh-view-button sheet-open-record-viewer">View</button>
        </summary>
        <div class="body">
          <div class="ovh-hp-bar"><span class="ovh-hp-bar-fill purple ${pct <= 25 ? "danger" : pct <= 50 ? "warn" : ""}" style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>
          ${resource.description ? `<p class="desc">${esc(resource.description)}</p>` : ""}
          ${(resource.log || []).length ? renderInlineLog(resource.log) : ""}
        </div>
      </details>
    `;
  }

  function renderLogDetails(title, subtitle, log) {
    return `
      <details class="ovh-record ovh-log-record">
        <summary>
          <div class="title-block">
            <div class="title">${esc(title)} <span class="sub">${esc(subtitle)}</span></div>
          </div>
        </summary>
        <div class="body">
          ${renderInlineLog(log)}
        </div>
      </details>
    `;
  }

  function renderInlineLog(log) {
    return `
      <div class="ovh-log">
        ${log.slice(-12).reverse().map(renderLogEntry).join("")}
        ${log.length > 12 ? `<div class="text-muted text-sm">${log.length - 12} earlier entr${log.length - 12 === 1 ? "y" : "ies"}</div>` : ""}
      </div>
    `;
  }

  function renderLogEntry(entry) {
    const delta = Number(entry.delta || 0);
    const sign = delta >= 0 ? "+" : "";
    const cls = delta >= 0 ? "heal" : "dmg";
    return `
      <div class="ovh-log-entry">
        <span class="date">${esc(entry.date || "")}</span>
        <span class="delta ${cls}">${sign}${delta}</span>
        <span class="reason">${esc(entry.reason || "")}</span>
      </div>`;
  }

  function buildResourceViewerRecord(resource, mechanics) {
    return {
      kicker: "Resource",
      title: resource.name || "Resource",
      subtitle: `${resource.current} / ${resource.max}`,
      description: resource.description || "",
      chips: mechanics,
      sections: (resource.log || []).length ? [{
        title: "Recent Log",
        content: resource.log.slice(-12).reverse().map(entry => {
          const delta = Number(entry.delta || 0);
          const deltaText = delta >= 0 ? `+${delta}` : `${delta}`;
          return `${entry.date || ""}  ${deltaText}  ${entry.reason || ""}`.trim();
        }).join("\n"),
      }] : [],
      raw: resource,
    };
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".ovh-resource-record .sheet-open-record-viewer").forEach(button => {
      if (button.dataset.viewerWired === "true") return;
      button.dataset.viewerWired = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest(".ovh-resource-record");
        ViewCharacterUtils.openRecordViewer(ViewCharacterUtils.decodeDataAttr(row?.dataset.sheetRecord, {}));
      });
    });
  }

  return { render, wireInteractive };

})();
