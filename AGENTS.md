# Repository working instructions

## Documentation

Timestamp convention, selected 2026-10-20 at 2:05 pm PDT (America/Los_Angeles): include the local date, time and timezone when recording new decisions or substantive updates. Do not invent times for older date-only entries; timestamp later clarifications separately.

Start at `Documentation/Start Here.md`. It introduces folders; each retained folder/subfolder has an `x_Directory.md` with brief descriptions of its files. The one-off Current Handoff was removed; Start Here is the permanent entry point.

Keep one authoritative home for each decision, formula, inventory and count. Other documents link to it. Superseded drafts and duplicated summaries should be removed after retaining unique useful information; Git history is the recovery archive. Preserve reproducible audit evidence where it remains useful. The user explicitly abandoned the old character sheet and its obsolete custom-feature lore/mechanics; do not retain superseded source sheets in the working documentation merely for history. The pushed Git baseline is the recovery archive. Do not replace normal prose with run-on shorthand.

Topic openings should state purpose, implementation status, selected decisions and open questions, followed by supporting detail. A directory description uses no more than three sentences per folder/file. Keep historical observations dated and separate from current decisions; do not revive superseded questions.

Carol revision decision, 2026-10-18: retain only the accepted `Documentation/Character Sheets/Carol Elfnein.md` and references supporting that revision. Remove superseded character sheets, builds, statistics and lore from working prose, including replacement bodies, memory transfer and artificial servants. Historical runtime evidence may remain for reproducing application defects; it is not character-design authority or a list of features to restore.

For substantive documentation cleanup, use focused sub-agents in batches of about eight files or one small folder. Each reports a usefulness score (0 obsolete/duplicate, 1 historical but unique, 2 useful merge candidate, 3 canonical), unique information to preserve, contradictions and questions. Assign bounded file ownership for edits. A separate comparison/review agent checks merged documents against the baseline for lost facts, duplicate authority and new contradictions. Sub-agents may ask the user questions directly when coordinated with the primary agent, or send questions through the primary as intermediary. Never guess to clear an ambiguity. The primary coordinates one topic/question at a time and relays answers to affected agents, avoiding competing batches. Deferred future design may remain explicitly open when it does not block the cleanup.

Use the questions tool for unresolved user decisions. Keep the turn open until outstanding questions have answers. An answer retaining “(Recommended)” may be auto-filled: verify intent before treating it as approval. Do not send duplicate question batches while earlier questions are pending.

## Current consolidation checkpoint

Baseline: commit `60e7b60`, branch `backup/docs-baseline-2026-10-18-3_45AM`, captured before this consolidation, associated with the user's 2026-10-18 03:43 America/Los_Angeles checkpoint. Revision branch: `codex/docs-consolidation`. The complete baseline was pushed to `https://github.com/Lulukitty22/Character_Manager.git` after the user confirmed the destination and requested the timestamped backup name.

Baseline Documentation: 143 files, 3,460,338 bytes. Troubleshooting accounts for 2,826,467 bytes, mostly evidence. The staged checkpoint changed 87 files with 6,779 insertions and 35 deletions after rename detection. Measure prose, evidence and file counts separately; do not delete evidence merely to reduce a byte metric.

Completed consolidation: preserved and pushed the baseline; ranked folder contents; merged unique useful information into canonical homes; removed superseded copies; added directory indexes and concise folder introductions; independently compared against baseline; checked links, anchors, index coverage and remaining policy contradictions. Changes concern documentation, not runtime implementation or backend setup.

Consolidation decisions: current runtime findings and original audit evidence remain distinct from selected gameplay rules. Removed source sheets and prior drafts stay recoverable in the pushed baseline, without local snapshot copies. Generated audit HTML and the duplicate composition text output are omitted; retained scripts, inputs, results and browser captures preserve reproducibility.

After consolidation: 63 Documentation files, 1063995 bytes; 20 Markdown files, 199197 bytes. All six retained folders/subfolders have an x_Directory index. The canonical sheet owns character counts and stock; the scroll design owns the published scribing baseline; the cost ledger contains derived examples. No runtime implementation changes were made in this consolidation.
