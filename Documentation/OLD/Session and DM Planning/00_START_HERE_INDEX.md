# Start Here - Segmented Gameplay Plan Index

This folder replaces the oversized unified planning document with small, named Markdown files. Use this file to choose the section you need instead of rereading the full plan.

## Current Source Priority

1. These segmented files are the active source of truth.
2. If something is unclear, open the relevant small file first.
3. Older unified plans are archive/reference material only.
4. If implementation changes a rule, path, phase, or surface name, update the relevant segmented file instead of creating a second competing plan.
5. Keep Session View and Dungeon Master View as separate surfaces.

## File Map

| File | Use When You Need |
|---|---|
| `01_SURFACES_AND_CAPABILITIES.md` | Surface names, old-name mappings, and capability presets. |
| `02_DND_GAMEPLAY_ACTION_HUB.md` | What the `D&D Gameplay` tab is, what sections it has, and what belongs in source tabs instead. |
| `03_SHARED_WIDGETS_DATA_COMMON.md` | Shared widget migration rules for HP, inventory, item actions, spells, resources, and auth. |
| `04_SESSION_AND_DUNGEON_MASTER_FLOW.md` | Player/session queue flow, future DM adjudication, alerts, side panels, and action lifecycles. |
| `05_RECORDS_SYNC_AUTH_SHIMS.md` | Campaign/session/encounter records, identity normalization, GitHub sync, auth, and thin-shim rules. |
| `06_AMMO_INVENTORY_RESOURCE_MODEL.md` | Ammo/resource ownership model and the Aina Quickquiver stress-test loop. |
| `07_ROADMAP_STATUS_AND_TESTS.md` | Phase plan, current status, recently landed work, remaining work, and checklist. |
| `LLM_HANDOFF_CHANGELOG.md` | Simple LLM-to-LLM instructions and a lightweight changelog/inbox. |

## One-Screen Summary

Build the sheet runtime around shared widgets in `data/common`. Public surfaces are `Editor`, `Character Card`, `Session View`, and a future `Dungeon Master View`. `D&D Gameplay` is the shared action hub, not a second full sheet or global log dump. Session View queues actions in v1 and does not directly mutate canonical gameplay state. GitHub remains canonical for v1, with roughly 10-second polling plus manual refresh. Exported HTML files stay tiny shims and never embed secrets.
