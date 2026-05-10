# D&D Gameplay Action Hub

## Main Rule

`D&D Gameplay` is an **action hub**. It is not a second full sheet and not a global log dump.

It appears as:

- `Editor`: interactive/admin-capable.
- `Session View`: interactive, but queue/request based.
- `Character Card`: read-only summary.
- `Dungeon Master`: future adjudication/control view, separate from Session View.

## Locked v1 Sections

### Quick Actions

- heal
- damage
- temp HP
- rests
- common direct D&D actions

### Item Actions

- actionable items only
- one `Use` entrypoint opens the valid action menu
- examples: Drink, Open Bundle, Ready Arrow, Stow Arrow

### Spell Actions

- spend slots
- restore slots
- cast/request spell actions

### Combat Resources

- ammo
- charges
- slots
- temp HP
- special pools

### Utility

- potion-making
- prep
- conversions
- rests
- downtime/custom actions

## Source Tab Boundaries

Do not centralize every detail or history into `D&D Gameplay`.

| Source Tab | Owns |
|---|---|
| `D&D Stats` | HP widget, HP history, core stats context. |
| `Resources` | HP/resource widgets, ammo/charges/custom resource histories. |
| `Spells` | Spell reference, spell prep, slot/cast history. |
| `Inventory` | Ownership, metadata, item quantities, item/inventory history. |

## Two-Layer History Model

1. Primary detailed histories stay with the source tabs.
2. Session View gets only a simplified cross-cutting summary:
   - pending requests
   - approved/denied outcomes
   - system/game alerts
   - lightweight recent activity snippets

## Anti-Drift Rules

- Do not make `D&D Gameplay` a duplicate of Inventory, Spells, Stats, or Resources.
- Do not move detailed spell/item/resource histories into Gameplay unless a later design explicitly changes that.
- Do not add action buttons to Character Card unless the full persistence and DM-facing expectations are deliberately designed.
- Do not treat Session View actions as final canonical changes in v1.
