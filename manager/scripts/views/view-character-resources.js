/**
 * view-character-resources.js
 * HP log and custom resource rendering.
 */

const ViewCharacterResources = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;

  function render(character, customResources) {
    const dnd = character?.dnd || null;
    const resources = customResources || [];
    const hpLog = dnd?.hp?.log || [];
    const hpState = character && typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : (dnd?.hp || { current: 0, max: 0 });
    if (!hpLog.length && !resources.length) return "";

    const hpLogSection = hpLog.length > 0 ? `
      <div class="sheet-resource-block">
        <div class="sheet-resource-header">
          <span class="sheet-resource-name">HP Log</span>
          <span class="sheet-resource-values">${hpState.current} / ${hpState.max} HP</span>
        </div>
        <div class="sheet-resource-log">
          ${hpLog.slice(0, 10).map(entry => renderLogEntry(entry)).join("")}
          ${hpLog.length > 10 ? `<div class="text-muted text-sm">…${hpLog.length - 10} earlier entries</div>` : ""}
        </div>
      </div>` : "";

    const customBlocks = resources.map(resource => {
      const percent = resource.max > 0 ? Math.round((resource.current / resource.max) * 100) : 0;
      const barClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
      const mechanicChips = renderMechanicChips([
        { label: "Current", value: resource.current, kind: "quantity" },
        { label: "Max", value: resource.max, kind: "quantity" },
        ...(resource.addons?.mechanics || []),
      ]);
      return `
        <div class="sheet-resource-block">
          <div class="sheet-resource-header">
            <span class="sheet-resource-name">${esc(resource.name || "Resource")}</span>
            <span class="sheet-resource-values">${resource.current} / ${resource.max}</span>
          </div>
          ${mechanicChips}
          <div class="hp-bar-track" style="margin-bottom:var(--space-2)">
            <div class="hp-bar-fill ${barClass}" style="width:${percent}%"></div>
          </div>
          ${(resource.log || []).length > 0 ? `
          <div class="sheet-resource-log">
            ${resource.log.slice(0, 6).map(entry => renderLogEntry(entry)).join("")}
            ${resource.log.length > 6 ? `<div class="text-muted text-sm">…${resource.log.length - 6} earlier entries</div>` : ""}
          </div>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📊 Resources</h2>
        ${hpLogSection}
        ${customBlocks}
      </section>
    `;
  }

  function renderLogEntry(entry) {
    const sign = entry.delta >= 0 ? "+" : "";
    const cls = entry.delta >= 0 ? "sheet-log-positive" : "sheet-log-negative";
    return `
      <div class="sheet-log-entry">
        <span class="sheet-log-delta ${cls}">${sign}${entry.delta}</span>
        <span class="sheet-log-reason">${esc(entry.reason || "")}</span>
        <span class="sheet-log-date text-muted">${esc(entry.date || "")}</span>
      </div>`;
  }

  return { render };

})();
