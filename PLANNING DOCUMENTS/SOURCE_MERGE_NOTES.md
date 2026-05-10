# Source Merge Notes

Generated from the oversized unified plan plus the regenerated Codex split docs.

## Kept

- Newer public surface names: Editor, Character Card, Session View.
- Added explicit fourth planned surface: Dungeon Master View.
- Shared widget direction in `data/common`.
- `D&D Gameplay` action-hub model.
- Session View queue-only v1 model.
- Campaign/session/encounter/action record shapes.
- GitHub v1 canonical sync with about 30-second polling.
- Thin-shim export contract.
- Ammo/inventory/resource stress-test loop.
- Roadmap/status/testing checklist.

## Compressed or Removed

- Repeated explanations across the old three documents.
- Old wording that blurred Player and DM responsibilities.
- Repeated assumptions/test bullets.
- Long changelog details that did not change active rules.

## Verification Status

The previously tentative shared-runtime claims have now been verified in repo code:

- shared surface presets
- shared GitHub auth drawer
- shared `D&D Gameplay` renderer
- manifest/boot preset wiring
- Session View inbox/alerts scaffolding
- 30-second polling scaffolding
