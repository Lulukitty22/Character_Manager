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

  function encodeDataAttr(value) {
    try {
      return escAttr(JSON.stringify(value ?? null));
    } catch (error) {
      return "";
    }
  }

  function decodeDataAttr(value, fallback = null) {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function ensureRecordViewer() {
    if (document.getElementById("sheet-record-viewer")) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <dialog id="sheet-record-viewer" class="sheet-record-viewer">
        <div class="sheet-record-viewer-card">
          <div class="sheet-record-viewer-header">
            <div>
              <div id="sheet-record-viewer-kicker" class="sheet-record-viewer-kicker"></div>
              <h3 id="sheet-record-viewer-title" class="sheet-record-viewer-title">Record Viewer</h3>
              <p id="sheet-record-viewer-subtitle" class="sheet-record-viewer-subtitle"></p>
            </div>
            <button type="button" class="sheet-inline-button" id="btn-close-sheet-record-viewer">Close</button>
          </div>
          <div id="sheet-record-viewer-body" class="sheet-record-viewer-body"></div>
        </div>
      </dialog>
    `;
    document.body.appendChild(wrapper.firstElementChild);
  }

  function openRecordViewer(record = {}) {
    ensureRecordViewer();
    const dialog = document.getElementById("sheet-record-viewer");
    const kickerEl = document.getElementById("sheet-record-viewer-kicker");
    const titleEl = document.getElementById("sheet-record-viewer-title");
    const subtitleEl = document.getElementById("sheet-record-viewer-subtitle");
    const bodyEl = document.getElementById("sheet-record-viewer-body");
    const closeBtn = document.getElementById("btn-close-sheet-record-viewer");
    const chips = renderMechanicChips(record.chips || []);

    kickerEl.textContent = record.kicker || "Read Only";
    titleEl.textContent = record.title || "Record Viewer";
    subtitleEl.textContent = record.subtitle || "";
    bodyEl.innerHTML = `
      ${chips}
      ${record.description ? `<div class="sheet-record-viewer-description">${esc(record.description)}</div>` : ""}
      ${(record.sections || []).map(section => renderViewerSection(section)).join("")}
      <details class="sheet-record-json">
        <summary>Metadata JSON</summary>
        <pre>${esc(JSON.stringify(record.raw || {}, null, 2))}</pre>
      </details>
    `;

    const closeDialog = () => {
      closeBtn.onclick = null;
      dialog.close();
    };
    closeBtn.onclick = closeDialog;

    if (!dialog.open) dialog.showModal();
  }

  function renderViewerSection(section = {}) {
    if (!section || (!section.title && !section.content)) return "";
    return `
      <section class="sheet-record-viewer-section">
        ${section.title ? `<h4>${esc(section.title)}</h4>` : ""}
        ${section.content ? `<div class="sheet-record-viewer-section-content">${section.content}</div>` : ""}
      </section>
    `;
  }

  function ensureToastContainer() {
    let container = document.getElementById("sheet-toast-container");
    if (container) return container;
    container = document.createElement("div");
    container.id = "sheet-toast-container";
    container.className = "sheet-toast-container";
    document.body.appendChild(container);
    return container;
  }

  function showToast(message, kind = "info") {
    const container = ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = `sheet-toast sheet-toast-${String(kind || "info").replace(/[^a-z0-9_-]/gi, "-")}`;
    toast.textContent = String(message || "");
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("sheet-toast-out");
      setTimeout(() => toast.remove(), 180);
    }, 2400);
  }

  return {
    esc,
    escAttr,
    normalizeMechanicChip,
    renderMechanicChips,
    encodeDataAttr,
    decodeDataAttr,
    openRecordViewer,
    showToast,
  };

})();
