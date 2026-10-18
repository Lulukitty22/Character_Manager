# Character Rendering

`ViewCharacter` resolves the character and builds a tabbed sheet from section renderers. Calculations, header quickstats and boss preview currently use different inputs, so their displayed values can disagree. Keep each numeric result tied to one resolved state and a visible source/formula.

- Coordinator/tabs: `data/common/scripts/views/view-character.js` (`buildTabs`, `buildHTML`, `wireInteractive`).
- Stats/AC/roll summaries: `views/view-character-dnd.js` within the same scripts folder.
- Boss preview/attacks/defences: `views/view-character-boss.js`.
- Header: `views/view-character-header.js`; gameplay/resources have separate renderers.
- HP/slots: `data/common/scripts/dnd-calculations.js`.
- Record detail modal/chips: `views/view-character-utils.js`; styles: `data/common/style/sheet.css`.
- 2026-10-12: boss HP toggle targets obsolete selectors; AC selection only changes header text; Carol's non-boss custom calculators never render.

## Intended shared state

One resolved active-effect state and shared game clock should drive every statistic display. Configured expiry is automatic; the DM can end effects early and players can request ending through the Instant flow. Hiding an effect does not disable its mechanics.

Character tabs are public by default, with owner-controlled per-tab privacy; the name remains visible. Action/effect notifications default to public even for private source tabs; the requester can hide an action/effect at submission. See [Campaigns and Shared Data](../Systems/Campaigns%20and%20Shared%20Data.md#character-sheet-visibility) and [Spell Effects and Active State](../Systems/Spell%20Effects%20and%20Active%20State.md). No runtime implementation is claimed.
