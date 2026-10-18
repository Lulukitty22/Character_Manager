# Aetherlock Costs and Damage

Updated 2026-10-18. This is the current cost ledger, including the 2026-10-18 clarification that Arcana modifies both scribing and installation/removal. The earlier undiscounted level 1+ mounting totals are superseded. [Aetherlock Engineered Rounds](Aetherlock%20Engineered%20Rounds.md) owns actions and delivery; [Containers and Scrolls](../Systems/Spell%20Containers%20and%20Consumable%20Sources.md) owns scribing, mounting and the single-item lifecycle. Costs do not debit existing gold, slots or stock.

The former 10 gp/slot-level Spellround recipe is superseded by actual scroll scribing plus mounting. Earlier prices are archived under [Before Scroll Pricing](../_OLD/Carol%20Planning%20Snapshots/2026-10-17%20Before%20Scroll%20Pricing/Aetherlock%20Costs%20and%20Damage.md).

## Inputs

| Input | Selected cost / status |
|---|---|
| Complete Basic Round | Purchased at 1 gp. No second identical casing fee. Raw manufacture is unspecified. |
| DIY casing | Proposed: 1 gp brass yields ten casings. Not selected as a complete Basic Round recipe. |
| Scroll | Scribing baseline × scribe's Arcana multiplier, plus full specific consumed components. Required reusable components must be available. No additional payload slot payment. |
| Level 1+ mounting/removal | Baseline 50 gp and two hours per spell level, both multiplied by the operator Arcana multiplier. Same schedule for binder and Spellround insertion/removal. |
| Cantrip mounting/removal | Each operation: 15 gp and one eight-hour workday × operator's Arcana multiplier. Separate from new scroll creation. |
| Arcane enhancement | One Basic + 5 gp crystal dust + 5 gp runic ink; ten minutes, no slot. |
| HEDP batch | One 100 gp grenade + six Basic + 20 gp parts; one hour with Tinker's Tools produces six rounds. |
| Empty canister refill | Current: 12 gp reagents + one hour with Tinker's Tools + one first-level slot; fills 12 charges in an existing shell. Proposed 120 gp reagents remain unselected. |

## Scribing reference and multiplier

Use **M = 3^((5 − A)/5)**, where A is total Arcana. It is not a roll; tool proficiency never supplies another score or stacked bonus. Arcana or Calligrapher proficiency remains a separate eligibility route. Prepare the spell each inscription day and retain required components under the recorded baseline.

Multiply baseline materials and work by M, then add specific consumed components at full cost. Installation/removal also multiplies its own baseline fees and time by the operator Arcana multiplier, including level 1+ handling. Purchases, specific consumed components and other recipes are not discounted. One workday is eight hours. Preserve precision; displayed values below are rounded comparisons pending a final rounding policy.

| Spell level | Baseline materials | Baseline workdays | Carol's materials at Arcana +16 | Carol's workdays |
|---|---:|---:|---:|---:|
| Cantrip | 15 gp | 1 | 1.34 gp | 0.08919 |
| 1 | 25 gp | 1 | 2.23 gp | 0.08919 |
| 2 | 100 gp | 3 | 8.92 gp | 0.26758 |
| 3 | 150 gp | 5 | 13.38 gp | 0.44597 |
| 4 | 1,000 gp | 10 | 89.19 gp | 0.89194 |
| 5 | 1,500 gp | 25 | 133.79 gp | 2.22984 |
| 6 | 10,000 gp | 40 | 891.94 gp | 3.56774 |
| 7 | 12,500 gp | 50 | 1,114.92 gp | 4.45968 |
| 8 | 15,000 gp | 60 | 1,337.90 gp | 5.35161 |
| 9 | 50,000 gp | 120 | 4,459.68 gp | 10.70322 |

Carol's M is approximately 0.08919350686224783, from INT +6 and Expertise with PB +5. Only the scribe's score discounts their scribing; an assembler uses their own score for cantrip mounting. An eligible donor is needed for a spell Carol cannot cast. Higher-level upcast scroll pricing still needs an explicit policy; do not charge the base tier for a stronger saved cast by assumption.

## Completed ammunition

The table uses purchased Basic Rounds and Carol's scribing/mounting where eligible. Full consumed components are additional unless specified. Damage/healing means precede accuracy, saves, resistance and immunity.

| Round | Recipe | Work | Ammo cost | Average effect |
|---|---|---|---:|---|
| Basic | Complete Basic | Manufacture unspecified | 1 gp | 2d10 +6 = 17 Piercing |
| Arcane | Basic + dust + ink | 10 minutes | 11 gp | 2d10 +6 +2d6 = 24 total |
| HEDP | Grenade + six Basic + parts → six | One hour/batch | 21 gp each | 5d6 = 17.5 Piercing; 20 ft radius, DC 15 DEX half |
| Cone of Cold 5 | Basic + Carol's fifth-level scroll +22.30 gp discounted mounting | 2.22984 workdays +0.89194 hours | 157.09 gp | 8d8 +6 = 42 Cold with eligible Evoker bonus; DC 19 CON half |
| Shield 1 | Basic + Carol's first-level scroll +4.46 gp discounted mounting | 0.08919 workday +0.17839 hours | 7.69 gp | +5 AC; selected rifle Reaction delivery |
| Cure Wounds 1 | Basic + Carol's first-level scroll +4.46 gp discounted mounting | 0.08919 workday +0.17839 hours | 7.69 gp | 2d8 +6 = 15 healing |
| Cantrip | Basic + new scroll + separate mount | Two ×0.08919 workday, about 85.63 minutes | 3.68 gp | Depends on spell and donor scaling |
| Revivify 3 — example only | Basic + donor scroll +300 gp consumed diamond + discounted mounting | 5 × scribe M workdays +6 × installer M hours | 301 gp +150 gp × scribe M +150 gp × installer M | Eligible dead creature returns with 1 HP; qualified donor needed |

Cone of Cold has no priced consumed component in this example. Shield/Cure Wounds have V/S and no material component. Revivify is not a new grant or stock selection; Carol cannot supply it. Do not apply her Arcana discount to another donor's work.

Assembly moves the same real scroll into its container, not a duplicate or second scribing. An owned scroll needs mounting only; a new scroll needs both jobs. Extracting it preserves identity and snapshot. Mechanical loading of completed ammunition remains free under the weapon rule; that is separate from hours-long mounting work.

Binder casting pays current-user resources and uses their current statistics, preserving the original snapshot for later loose/round use. Do not sum donor and current-caster bonuses or choose the better set. A fifth-level mount has a baseline of 250 gp/10 hours before the operator multiplier; it only handles the existing item and never creates another charged scroll. The published own-book backup rate is reference, not a selected discount.

## Firing power, separate from ammunition

A canister holds 12 charges. Basic/Arcane use one per projectile; Precision Basic/Arcane use four; every stored Spellround and HEDP uses two, including cantrip, healing and Shield. Current 12 gp refills allocate 1 gp reagents per charge; the unapproved 120 gp proposal would allocate 10 gp per charge.

| Shot | Ammo + power at current refill | If 120 gp proposal were approved |
|---|---:|---:|
| Basic | 2 gp | 11 gp |
| Arcane | 12 gp | 21 gp |
| HEDP | 23 gp | 41 gp |
| Cone of Cold 5 | 159.09 gp | 177.09 gp |
| Shield / Cure Wounds 1 | 9.69 gp | 27.69 gp |
| Cantrip Spellround | 5.68 gp | 23.68 gp |
| Revivify 3 example | 303 gp +150 gp × scribe M +150 gp × installer M | 321 gp +150 gp × scribe M +150 gp × installer M |
| Precision Basic / Arcane | 5 gp / 15 gp | 41 gp / 51 gp |

Allocated reagent value is not another at-fire fee. A full refill still costs one whole first-level slot and one hour; do not create usable fractional slots. A full canister supports 12 ordinary Basic/Arcane projectiles, six Spellround/HEDP or three Precision projectiles.

Current stock: 18 Basic +6 Arcane +3 Cone of Cold +3 HEDP +2 Shield +2 Cure Wounds = 34 rounds. Five filled canisters hold 60 charges. Normal stock expenditure costs 44 charges; no automatic rest refill or historical gold/slot debit applies.

Prior sources, recorded as verified 2026-10-17: [scribing](https://www.dndbeyond.com/sources/dnd/br-2024/equipment#ScribingSpellScrolls), [scrolls](https://www.dndbeyond.com/sources/dnd/br-2024/magic-items-a-z#SpellScroll), and [Wizard copying](https://www.dndbeyond.com/sources/dnd/br-2024/character-classes#Wizard). Universal scroll access, enhanced donor snapshots, binder behavior, mounting and weapon recipes are campaign mechanics. This cleanup does not claim fresh source verification.
