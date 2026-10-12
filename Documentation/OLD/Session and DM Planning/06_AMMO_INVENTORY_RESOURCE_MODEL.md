# Ammo, Inventory, and Resource Model

## Main Rule

Inventory and gameplay resources should not duplicate the same number without a clear derivation.

- Inventory represents owned stock.
- Gameplay resources represent immediately spendable / loaded state.
- If the same count appears in both, one should be derived from the other or the relationship should be explicitly documented.

## Current Stress-Test Loop

The baseline ammo loop is:

```text
Arrow Bundle (20) -> Loose Arrow inventory stock -> Field Quiver ready-ammo resource -> Field Shortbow spend action
```

Use this as the test specimen before generalizing the system to:

- bolts
- thrown consumables
- durability
- loaded magazines
- special ammo pools
- DM-facing turn tools

## Current Known Follow-Ups

- `Field Quiver` currently has two inverse actions: `Ready 1 Arrow` and `Stow 1 Arrow`.
- Revisit whether that should become:
  - one contextual control
  - a signed stepper
  - a richer ammo widget
- Rebundling loose arrows back into `Arrow Bundle (20)` is not modeled yet.
- Treat rebundling as later backend design, not a sneaky one-off rule.
- Bow/item actions must hard-stop when required resources are empty.
- Ammo, charges, durability, and loaded resources need clearer real-time visibility.

## Local State vs GitHub Writes

Gameplay state should stay coherent locally during a session:

- shooting, drinking, reloading, and similar actions should update local visible state immediately
- resource counts should remain visible without a GitHub round-trip per click
- saving should persist the final local result once, not perform one remote write per small gameplay action
- canonical state still depends on queue/adjudication rules where applicable

## Healing Decision Still Open

Gameplay healing needs a design decision:

- average-only healing
- roll-driven healing
- DM-confirmed healing result

Until decided, do not silently hard-code a permanent healing model.
