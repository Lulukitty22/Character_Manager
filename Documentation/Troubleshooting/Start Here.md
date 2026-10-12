# Troubleshooting

Two audits document the repository state and actual character-sheet defects as of2026-10-12. They are observations and repair planning, not implemented fixes. Read the character audit for Carol/Capella/Seraphine; use the broader audit for save-pipeline and repository history.

- [Character Composition Audit](CHARACTER_COMPOSITION_AUDIT.md):36 character findings, shared feature gaps, LLM proposal, repair sequence.
- [Repository Audit](AUDIT_REPORT.md): branch/history, runtime, canonical conversion, save failures, other characters.
- [Notes/Character Composition Issues.txt](Notes/CHARACTER_COMPOSITION_ISSUES.txt): running detailed discoveries.
- [Notes/Repository Issues.txt](Notes/ISSUES.txt): original running discoveries.
- `Evidence`: scripts, current/remote data snapshots, JSON repro results,24 browser observations and screenshots. Generated HTML is test material, not a production sheet.
- Run audit scripts from repository root. They seed saved remote snapshots and do not write production data; the save simulation uses mocked GitHub writes.
- Short navigation notes belong in `Documentation/Primary`; detailed new issue evidence belongs here.
