/**
 * view-character.js
 * Coordinator for the sheet renderer. Wraps the existing section
 * renderers in a tabbed structure with a sticky head + quickstats.
 */

const ViewCharacter = (() => {

  /**
   * Tab definitions. Each tab has an id (used as the panel/data-tab key)
   * and a label. The `render` function receives the resolved character and
   * returns the panel's inner HTML — empty strings collapse the tab away
   * (it won't render at all).
   */
  function buildTabs(character) {
    const identity = character.identity || {};
    const appearance = character.appearance || {};
    const dnd = character.dnd || null;
    const boss = character.boss || null;
    const roblox = character.roblox || null;
    const spells = character.spells || [];
    const spellSlots = typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveSpellSlots(character).slots
      : (character.spellSlots || {});
    const abilities = character.abilities || [];
    const inventory = character.inventory || [];
    const currency = character.currency || {};
    const resources = character.customResources || [];

    return [
      {
        id: "identity",
        label: "Identity",
        render: () => ViewCharacterIdentity.render(identity, appearance, character),
      },
      {
        id: "stats",
        label: "Stats",
        render: () => [
          dnd ? ViewCharacterDnd.renderCombatBlock(dnd, boss, character) : "",
          dnd ? ViewCharacterDnd.renderAbilityScores(dnd, boss) : "",
          dnd ? ViewCharacterDnd.renderSavingThrows(dnd, boss) : "",
          dnd ? ViewCharacterDnd.renderSkills(dnd, boss) : "",
          boss ? ViewCharacterBoss.renderBossDefences(boss) : "",
        ].filter(Boolean).join(""),
      },
      {
        id: "abilities",
        label: "Abilities & Feats",
        render: () => [
          dnd ? ViewCharacterDnd.renderFeatsAndMulticlass(dnd) : "",
          abilities.length ? ViewCharacterAbilities.render(abilities) : "",
          boss ? ViewCharacterBoss.renderPolymorphTraits(boss) : "",
          boss ? ViewCharacterBoss.renderBossSpecialRules(boss) : "",
        ].filter(Boolean).join(""),
      },
      {
        id: "spells",
        label: "Spells",
        render: () => spells.length ? ViewCharacterSpells.render(spells, spellSlots) : "",
      },
      {
        id: "combat",
        label: "Combat",
        render: () => boss ? [
          ViewCharacterBoss.renderToggleBar(boss),
          ViewCharacterBoss.renderAttacks(boss, dnd),
        ].filter(Boolean).join("") : "",
      },
      {
        id: "inventory",
        label: "Inventory",
        render: () => ViewCharacterInventory.render(character, inventory, currency),
      },
      {
        id: "resources",
        label: "Resources",
        render: () => ViewCharacterResources.render(character, resources),
      },
      {
        id: "roblox",
        label: "Roblox",
        render: () => roblox ? ViewCharacterRoblox.render(roblox) : "",
      },
      {
        id: "notes",
        label: "Notes",
        render: () => ViewCharacterNotes.render(character),
      },
    ];
  }

  function buildHTML(character) {
    if (typeof Library !== "undefined") {
      character = Library.resolveCharacterSync(character);
    }

    const allTabs = buildTabs(character);
    // Drop tabs whose render() returns an empty string — keeps the nav clean
    // when sections don't apply (e.g. no spells, no boss block).
    const tabs = allTabs
      .map(t => ({ ...t, content: t.render() }))
      .filter(t => t.content && t.content.trim().length > 0);

    const headerHTML = ViewCharacterHeader.render(character, tabs);
    const panelsHTML = tabs.map((t, i) => `
      <section class="ovh-panel ${i === 0 ? "active" : ""}" data-ovh-panel="${t.id}">
        ${t.content}
      </section>
    `).join("");

    return `
      <div class="sheet-root ovh-tabbed ${character.boss?.bossActive ? "is-boss-active" : "is-tamed-active"}"
           data-boss-active="${character.boss?.bossActive ? "true" : "false"}">
        ${headerHTML}
        <div class="ovh-panels">
          ${panelsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Wire tab switching + delegate to existing section interactivity.
   */
  function wireInteractive(containerEl, character) {
    // Tab switching — clicking a .ovh-tab activates its panel
    const tabs = containerEl.querySelectorAll(".ovh-tab");
    const panels = containerEl.querySelectorAll(".ovh-panel");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-ovh-tab");
        tabs.forEach(t => t.classList.toggle("active", t === tab));
        panels.forEach(p => p.classList.toggle("active", p.getAttribute("data-ovh-panel") === target));
      });
    });

    // Existing section wirings (unchanged)
    if (character.boss && typeof ViewCharacterBoss?.wireInteractive === "function") {
      ViewCharacterBoss.wireInteractive(containerEl, character);
    }
    ViewCharacterNotes.wireInteractive?.(containerEl);
    ViewCharacterDnd.wireInteractive?.(containerEl);
    ViewCharacterSpells.wireInteractive?.(containerEl, character);
    ViewCharacterAbilities.wireInteractive?.(containerEl, character);
    ViewCharacterInventory.wireInteractive?.(containerEl, character);
    ViewCharacterResources.wireInteractive?.(containerEl, character);
    ViewCharacterUtils.wireRecordCardViewers?.(containerEl);
  }

  function mount(containerEl, character) {
    containerEl.innerHTML = buildHTML(character);
    wireInteractive(containerEl, character);
  }

  return {
    buildHTML,
    wireInteractive,
    mount,
  };

})();
