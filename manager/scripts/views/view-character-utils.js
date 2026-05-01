/**
 * view-character-utils.js
 * Shared HTML escaping helpers for the sheet renderer modules.
 */

const ViewCharacterUtils = (() => {

  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function normalizeMechanicChip(chip, fallbackKind = "neutral") {
    if (!chip) return null;
    if (typeof chip === "string") {
      return { label: chip, kind: fallbackKind };
    }

    const label = chip.label || chip.name || chip.type || "";
    const value = chip.value ?? chip.amount ?? "";
    if (!label && value === "") return null;

    return {
      ...chip,
      label,
      value,
      kind: chip.kind || fallbackKind,
      description: chip.description || chip.note || chip.tooltip || "",
      relatedRoll: chip.relatedRoll || chip.roll || "",
    };
  }

  function renderMechanicChips(chips, options = {}) {
    const seen = new Set();
    const normalized = (chips || [])
      .map(chip => normalizeMechanicChip(chip, options.kind || "neutral"))
      .filter(chip => {
        if (!chip) return false;
        const key = [chip.kind, chip.label, chip.value].map(value => String(value || "").toLowerCase()).join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (!normalized.length) return "";

    const className = options.className || "sheet-mechanic-chips";
    return `
      <div class="${escAttr(className)}">
        ${normalized.map(renderMechanicChip).join("")}
      </div>
    `;
  }

  function renderMechanicChip(chip) {
    const kind = String(chip.kind || "neutral").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const title = [chip.description, chip.relatedRoll ? `Related: ${chip.relatedRoll}` : ""].filter(Boolean).join("\n");
    const value = chip.value !== "" && chip.value != null ? `<span class="sheet-mechanic-value">${esc(chip.value)}</span>` : "";

    if (chip.description || chip.relatedRoll) {
      return `
        <details class="sheet-mechanic-chip sheet-mechanic-${escAttr(kind)}" title="${escAttr(title)}">
          <summary>
            <span class="sheet-mechanic-label">${esc(chip.label)}</span>
            ${value}
          </summary>
          <div class="sheet-mechanic-popover">
            ${chip.description ? `<p>${esc(chip.description)}</p>` : ""}
            ${chip.relatedRoll ? `<p><strong>Related:</strong> ${esc(chip.relatedRoll)}</p>` : ""}
          </div>
        </details>
      `;
    }

    return `
      <span class="sheet-mechanic-chip sheet-mechanic-${escAttr(kind)}" title="${escAttr(title)}">
        <span class="sheet-mechanic-label">${esc(chip.label)}</span>
        ${value}
      </span>
    `;
  }

  return {
    esc,
    escAttr,
    normalizeMechanicChip,
    renderMechanicChips,
  };

})();
