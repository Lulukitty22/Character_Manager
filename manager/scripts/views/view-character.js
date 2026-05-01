/**
 * view-character.js
 * Thin coordinator for the sheet renderer.
 */

const ViewCharacter = (() => {

  function buildHTML(character) {
    const identity = character.identity || {};
    const appearance = character.appearance || {};
    const dnd = character.dnd || null;
    const boss = character.boss || null;
    const roblox = character.roblox || null;
    const spells = character.spells || [];
    const spellSlots = character.spellSlots || {};
    const abilities = character.abilities || [];
    const inventory = character.inventory || [];
    const currency = character.currency || {};
    const resources = character.customResources || [];

    return `
      <div class="sheet-root" data-boss-active="${boss?.bossActive ? "true" : "false"}">
        ${ViewCharacterHeader.render(character)}
        ${boss ? ViewCharacterBoss.renderToggleBar(boss) : ""}
        ${ViewCharacterIdentity.render(identity, appearance, character)}
        ${dnd ? ViewCharacterDnd.renderCombatBlock(dnd, boss) : ""}
        ${dnd ? ViewCharacterDnd.renderAbilityScores(dnd) : ""}
        ${dnd ? ViewCharacterDnd.renderSavingThrows(dnd) : ""}
        ${dnd ? ViewCharacterDnd.renderSkills(dnd) : ""}
        ${boss ? ViewCharacterBoss.renderAttacks(boss) : ""}
        ${boss ? ViewCharacterBoss.renderBossDefences(boss) : ""}
        ${boss ? ViewCharacterBoss.renderPolymorphTraits(boss) : ""}
        ${boss ? ViewCharacterBoss.renderBossSpecialRules(boss) : ""}
        ${dnd ? ViewCharacterDnd.renderFeatsAndMulticlass(dnd) : ""}
        ${roblox ? ViewCharacterRoblox.render(roblox) : ""}
        ${spells.length ? ViewCharacterSpells.render(spells, spellSlots) : ""}
        ${abilities.length ? ViewCharacterAbilities.render(abilities) : ""}
        ${ViewCharacterInventory.render(inventory, currency)}
        ${ViewCharacterResources.render(dnd, resources)}
        ${ViewCharacterNotes.render(character.notes)}
      </div>
    `;
  }

  /**
   * Wire interactive elements after the HTML has been inserted into the DOM.
   */
  function wireInteractive(containerEl, character) {
    ViewCharacterBoss.wireInteractive(containerEl, character);
  }

  return {
    buildHTML,
    wireInteractive,
  };

})();

document.addEventListener("DOMContentLoaded", () => App.init());
