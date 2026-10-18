# Ability Score Policy

Campaign policy confirmed 2026-10-16: ability scores may exceed ordinary published limits. Show an informational marker above the usual20; never clamp or block an upper score. Continue modifier scaling with floor((score−10)/2). Published-source verification still matters, but DM-granted exceptions are valid explicit sources, not errors to erase.

## Carol's confirmed grant

**Indomitable** is a DM-granted homebrew trait earned during play, not a starting feat/racial bonus. Effect: +2 to one chosen ability; Carol's chosen ability is INT. Keep INT 22/+6, with an explicit+2INT source. The implied pre-trait score20 still needs its constituent creation/level sources mapped; do not reapply the trait on top of a stored final22. No freely repeatable/reassignable bonus was approved. Other characters can choose a different ability when receiving the same kind of grant.

This grant costs no character-creation point-buy points. Do not invent a Tome of Clear Thought in Carol's inventory to justify it. The revised published Tome actually increases INT by2 (up to30) after study; it does not merely unlock an empty ceiling.

## Point-buy estimates

Standard point buy ends at15. Extended costs are **campaign estimates**, not official rules or enforceable caps. No point-buy calculator was found in the current editor search; this is the proposed cost policy for future implementation, not an existing UI feature.

One reasonable continuation of marginal costs: after14/15 each cost2points per increase,16/17 each cost3,18/19 each cost4,20/21 each cost5,22/23 each cost6, and so on. Total costs from8=0:15→9,16→12,17→15,18→19,19→23,20→28,21→33,22→39. Label the extrapolation, allow overrides and keep actual DM gifts/level-up increases separate from starting-score purchases. This estimate is proposed, not a newly mandatory campaign budget.

## Current implementation

- `data/common/scripts/schema.js:getAbilityModifier` already scales without an upper clamp.
- `data/editor/scripts/editor-dnd.js:renderStatInputGroup` previously had max30; removed upper bound, added a live nonblocking above20 marker. Normal minimum/integer input retained.
- `data/common/scripts/views/view-character-dnd.js:renderAbilityScores` marks base scores above20 on the sheet.
- No production character/trait JSON changed. Trait source/effect integration awaits clean rebuild to avoid double counting. Syntax checks passed for both changed scripts; no browser validation claimed.

The nearby class-level/spell-slot maxima are different concepts and were not removed under this ability-score request.
