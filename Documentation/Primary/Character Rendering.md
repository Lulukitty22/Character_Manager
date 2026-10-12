# Character Rendering

`ViewCharacter` resolves the character and builds a tabbed sheet from section renderers. Calculations, header quickstats and boss preview currently use different inputs, so their displayed values can disagree. Keep each numeric result tied to one resolved state and a visible source/formula.

- Coordinator/tabs: `data/common/scripts/views/view-character.js` (`buildTabs`, `buildHTML`, `wireInteractive`).
- Stats/AC/roll summaries: `views/view-character-dnd.js` within the same scripts folder.
- Boss preview/attacks/defences: `views/view-character-boss.js`.
- Header: `views/view-character-header.js`; gameplay/resources have separate renderers.
- HP/slots: `data/common/scripts/dnd-calculations.js`.
- Record detail modal/chips: `views/view-character-utils.js`; styles: `data/common/style/sheet.css`.
- 2026-10-12: boss HP toggle targets obsolete selectors; AC selection only changes header text; Carol's non-boss custom calculators never render.
