/**
 * view-character-spells.js
 * Spell list rendering.
 */

const ViewCharacterSpells = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderOvhChips = ViewCharacterUtils.renderOvhChips;

  function render(spells, spellSlots = {}) {
    if (!spells || !spells.length) return "";

    const grouped = {};
    spells.forEach(spell => {
      const level = Number(spell.level ?? 0) || 0;
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(spell);
    });

    const levelGroups = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map(level => renderLevelGroup(level, grouped[level], spellSlots[level]))
      .join("");

    return `
      <section class="ovh-section ovh-spells-section">
        <div class="ovh-section-header">
          <h2>Spells</h2>
          <div class="ovh-section-divider"><svg viewBox="0 0 600 14" preserveAspectRatio="none"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg></div>
        </div>
        ${levelGroups}
      </section>
    `;
  }

  function renderLevelGroup(level, spells, slot) {
    const levelLabel = level === 0 ? "Cantrips" : `Level ${level}`;
    return `
      <div class="ovh-record-group ovh-spell-level-group">
        <p class="ovh-group-label">
          <span>${levelLabel}</span>
          ${slot ? renderSlotTracker(slot.current, slot.max) : `<span class="count">${spells.length} spell${spells.length === 1 ? "" : "s"}</span>`}
        </p>
        ${spells.map(renderSpellEntry).join("")}
      </div>
    `;
  }

  function renderSlotTracker(current, max) {
    const currentSafe = Math.max(0, Number(current || 0));
    const maxSafe = Math.max(0, Number(max || 0));
    const pct = maxSafe > 0 ? Math.round((currentSafe / maxSafe) * 100) : 0;
    const tone = pct <= 25 ? "danger" : pct <= 50 ? "warn" : "";
    return `
      <span class="ovh-group-meter" title="${currentSafe}/${maxSafe} slots">
        <span class="ovh-mini-bar ${tone}"><i style="width:${pct}%"></i></span>
        <span class="count">${currentSafe} / ${maxSafe} slots</span>
      </span>
    `;
  }

  function renderSpellEntry(spell) {
    const components = (spell.components || []).join(", ");
    const mechanics = [
      ...spellAccessChips(spell),
      spell.castingTime ? { label: "Cast", value: spell.castingTime, kind: "action" } : null,
      spell.range ? { label: "Range", value: spell.range, kind: "range" } : null,
      components ? {
        label: "Components",
        value: components,
        kind: "component",
        description: "Spell components required to cast this spell.",
      } : null,
      spell.duration ? { label: "Duration", value: spell.duration, kind: "duration" } : null,
      spell.addons?.ritual?.enabled ? {
        label: "Ritual",
        kind: "positive",
        description: "Can be cast as a ritual if the caster has the right feature or permission.",
      } : null,
      spell.addons?.concentration?.enabled ? {
        label: "Concentration",
        kind: "requirement",
        description: "Requires concentration; taking damage or losing focus can end the spell.",
      } : null,
      ...spellDamageChips(spell),
      ...(spell.addons?.mechanics || []),
    ].filter(Boolean);

    const chips = renderOvhChips(mechanics, { className: "ovh-chips quick-chips" });
    const tags = (spell.tags || []).slice(0, 10)
      .map(tag => `<span class="ovh-chip tone-neutral">${esc(tag)}</span>`)
      .join("");
    const levelLabel = Number(spell.level || 0) === 0 ? "Cantrip" : `Level ${Number(spell.level || 0)}`;
    const subtitle = [levelLabel, spell.school || ""].filter(Boolean).join(" | ");
    const openAttr = spell.prepared || spell.access?.label ? " open" : "";

    return `
      <details class="ovh-record ovh-spell-record sheet-record-card" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildSpellViewerRecord(spell, mechanics))}"${openAttr}>
        <summary>
          <span class="ovh-status-dot ${spell.prepared ? "prepared" : ""}" title="${spell.prepared ? "Prepared" : "Known"}"></span>
          <div class="title-block">
            <div class="title">
              ${esc(spell.name || "(Unnamed spell)")}
              ${subtitle ? `<span class="sub">${esc(subtitle)}</span>` : ""}
            </div>
            ${chips}
          </div>
          <button type="button" class="ovh-view-button sheet-open-record-viewer">View</button>
        </summary>
        <div class="body">
          ${spell.description ? `<p class="desc">${esc(spell.description)}</p>` : ""}
          ${tags ? `<div class="ovh-chips ovh-tags">${tags}</div>` : ""}
        </div>
      </details>`;
  }

  function spellDamageChips(spell) {
    const damage = spell.addons?.damage || {};
    const area = spell.addons?.area || {};
    const chips = [];

    if (damage.roll) {
      const types = Array.isArray(damage.types) ? damage.types.join(", ") : damage.types || "";
      chips.push({
        label: "Damage",
        value: [damage.roll, types].filter(Boolean).join(" "),
        kind: "damage",
      });
    }

    if (damage.savingThrow) {
      chips.push({
        label: "Save",
        value: damage.savingThrow,
        kind: "requirement",
      });
    }

    if (area.shape || area.size) {
      chips.push({
        label: "Area",
        value: [area.size, area.unit, area.shape].filter(Boolean).join(" "),
        kind: "range",
      });
    }

    return chips;
  }

  function spellAccessChips(spell) {
    const access = spell.access || spell.addons?.access || {};
    const chips = [];

    if (spell.prepared) {
      chips.push({
        label: access.preparedLabel || "Prepared",
        kind: "positive",
        description: "This spell is ready for active use on the sheet.",
      });
    } else if (access.showKnown !== false) {
      chips.push({
        label: access.knownLabel || "Known",
        kind: "neutral",
        description: "Known or available, but not currently marked prepared.",
      });
    }

    if (access.label || access.state) {
      chips.push({
        label: access.label || access.state,
        value: access.value || "",
        kind: access.kind || "neutral",
        description: access.description || access.note || "",
        relatedRoll: access.relatedRoll || "",
      });
    }

    (access.chips || []).forEach(chip => chips.push(chip));
    return chips;
  }

  function buildSpellViewerRecord(spell, mechanics) {
    return {
      kicker: "Spell",
      title: spell.name || "(Unnamed Spell)",
      subtitle: [Number(spell.level || 0) === 0 ? "Cantrip" : `Level ${Number(spell.level || 0)}`, spell.school || ""].filter(Boolean).join(" | "),
      description: spell.description || "",
      chips: mechanics,
      sections: [
        {
          title: "Casting",
          content: [
            spell.castingTime ? `Casting Time: ${spell.castingTime}` : "",
            spell.range ? `Range: ${spell.range}` : "",
            spell.duration ? `Duration: ${spell.duration}` : "",
            (spell.components || []).length ? `Components: ${(spell.components || []).join(", ")}` : "",
          ].filter(Boolean).join("\n"),
        },
      ].filter(section => section.content),
      raw: spell,
    };
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".ovh-spell-record .sheet-open-record-viewer").forEach(button => {
      if (button.dataset.viewerWired === "true") return;
      button.dataset.viewerWired = "true";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest(".ovh-spell-record");
        ViewCharacterUtils.openRecordViewer(ViewCharacterUtils.decodeDataAttr(row?.dataset.sheetRecord, {}));
      });
    });
  }

  return { render, wireInteractive };

})();
