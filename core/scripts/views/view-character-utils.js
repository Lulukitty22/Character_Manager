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

  function renderOvhChips(chips, options = {}) {
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
    return `
      <div class="${escAttr(options.className || "ovh-chips")}">
        ${normalized.map(renderOvhChip).join("")}
      </div>
    `;
  }

  function renderOvhChip(chip) {
    const tone = toneForKind(chip.kind);
    const title = [chip.description, chip.relatedRoll ? `Related: ${chip.relatedRoll}` : ""].filter(Boolean).join("\n");
    const value = chip.value !== "" && chip.value != null ? `<span class="v">${esc(chip.value)}</span>` : "";
    const label = value ? `<span class="k">${esc(chip.label)}</span>` : esc(chip.label);
    const dataTip = title ? ` data-tip="${escAttr(title)}" title="${escAttr(title)}"` : "";
    return `<span class="ovh-chip ${escAttr(tone)}"${dataTip}>${label}${value}</span>`;
  }

  function toneForKind(kind = "") {
    const clean = String(kind || "neutral").toLowerCase();
    if (["positive", "prepared", "success", "heal", "healing"].includes(clean)) return "tone-heal";
    if (["damage", "negative", "danger"].includes(clean)) return "tone-dmg";
    if (["requirement", "warning", "warn", "save"].includes(clean)) return "tone-warn";
    if (["action", "duration", "range", "component", "quantity"].includes(clean)) return "tone-info";
    if (["rest", "resource"].includes(clean)) return "tone-rest";
    if (["attune", "attunement"].includes(clean)) return "tone-attune";
    return "tone-neutral";
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

  function buildRecordViewerRecord(record = {}, options = {}) {
    const collection = options.collection || record.collection || record.libraryCollection || "";
    const chips = [
      ...genericRecordChips(record, collection),
      ...(record.addons?.mechanics || []),
      ...(options.chips || []),
    ];
    const sourceDoc = record.addons?.sourceDocument || {};
    const sourceDocs = [sourceDoc, ...(record.addons?.sourceDocuments || [])].filter(doc => doc && Object.keys(doc).length);
    return {
      kicker: options.kicker || labelForCollection(collection) || record.type || "Library Record",
      title: options.title || record.name || "(Unnamed Record)",
      subtitle: options.subtitle || buildRecordSubtitle(record, collection),
      description: options.description ?? record.description ?? "",
      chips,
      sections: [
        ...(options.sections || []),
        sourceDocs.length ? {
          title: "Sources",
          content: sourceDocs.map(doc => [
            doc.title || doc.name || doc.provider || "Source",
            doc.type || "",
            doc.detailUrl || "",
          ].filter(Boolean).join(" | ")).join("\n"),
        } : null,
      ].filter(Boolean),
      raw: options.raw || record,
    };
  }

  function renderRecordSummary(record = {}, options = {}) {
    const viewer = buildRecordViewerRecord(record, options);
    const chips = renderMechanicChips(viewer.chips, { className: options.chipClassName || "sheet-mechanic-chips" });
    const description = viewer.description
      ? `<div class="${escAttr(options.descriptionClass || "sheet-record-viewer-description")}">${esc(viewer.description)}</div>`
      : "";
    return `
      <div class="${escAttr(options.className || "spell-browser-preview-card")}">
        <div class="array-item-title" style="margin-bottom: var(--space-1);">${esc(viewer.title)}</div>
        ${viewer.subtitle ? `<div class="array-item-subtitle" style="margin-bottom: var(--space-3);">${esc(viewer.subtitle)}</div>` : ""}
        ${chips}
        ${description}
        ${viewer.sections.map(renderViewerSection).join("")}
      </div>
    `;
  }

  function wireRecordCardViewers(containerEl) {
    containerEl?.querySelectorAll?.(".sheet-record-card[data-sheet-record]").forEach(card => {
      if (card.dataset.viewerWired === "true") return;
      card.dataset.viewerWired = "true";
      card.addEventListener("click", event => {
        if (event.target.closest("button, input, select, textarea, a, details")) return;
        openRecordViewer(decodeDataAttr(card.dataset.sheetRecord, {}));
      });
    });

    containerEl?.querySelectorAll?.(".sheet-open-record-viewer").forEach(button => {
      if (button.dataset.viewerWired === "true") return;
      button.dataset.viewerWired = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const card = button.closest("[data-sheet-record]");
        openRecordViewer(decodeDataAttr(card?.dataset.sheetRecord, {}));
      });
    });
  }

  function genericRecordChips(record = {}, collection = "") {
    const chips = [];
    if (record.source) chips.push({ label: "Source", value: record.source, kind: "neutral" });
    if (record.provider) chips.push({ label: "Provider", value: record.provider, kind: "neutral" });
    (record.sourceReferences || []).slice(0, 2).forEach(source => {
      chips.push({ label: "Provider", value: source.provider, kind: "neutral" });
    });
    if (record.type) chips.push({ label: "Type", value: record.type, kind: "neutral" });
    if (record.addons?.equipment?.rarity) chips.push({ label: "Rarity", value: record.addons.equipment.rarity, kind: "positive" });
    if (record.quantity != null && collection === "items") chips.push({ label: "Qty", value: record.quantity, kind: "quantity" });
    if (record.max != null && collection === "resources") chips.push({ label: "Max", value: record.max, kind: "quantity" });
    (record.tags || []).slice(0, 8).forEach(tag => chips.push({ label: tag, kind: "neutral" }));
    return chips;
  }

  function buildRecordSubtitle(record = {}, collection = "") {
    if (collection === "spells") {
      return [
        Number(record.level || 0) === 0 ? "Cantrip" : `Level ${Number(record.level || 0)}`,
        record.school || "",
        record.castingTime || "",
      ].filter(Boolean).join(" | ");
    }
    if (collection === "items") {
      return [record.type || "Item", record.addons?.equipment?.rarity || "", record.attuned ? "Requires attunement" : ""].filter(Boolean).join(" | ");
    }
    if (collection === "resources") {
      return [`Max ${Number(record.max || 0)}`, record.source || ""].filter(Boolean).join(" | ");
    }
    return [labelForCollection(collection), record.source || ""].filter(Boolean).join(" | ");
  }

  function labelForCollection(collection = "") {
    const labels = {
      spells: "Spell",
      items: "Item",
      resources: "Resource",
      tags: "Tag",
      feats: "Feat",
      traits: "Trait",
      classes: "Class",
      species: "Species",
    };
    return labels[collection] || "";
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
    renderOvhChips,
    encodeDataAttr,
    decodeDataAttr,
    openRecordViewer,
    buildRecordViewerRecord,
    renderRecordSummary,
    wireRecordCardViewers,
    showToast,
  };

})();
