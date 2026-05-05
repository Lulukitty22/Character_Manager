/**
 * view-character-notes.js
 * Notes panel renderer — personality, backstory, and DM notes.
 * Receives the full character object; personality + backstory moved here
 * from identity.js to match the mockup layout.
 */

const ViewCharacterNotes = (() => {

  const esc = ViewCharacterUtils.esc;

  const SVG_DIV = `<svg viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg>`;

  const PROSE_CUTOFF = 280;

  function buildProseBlock(text) {
    if (!text) return "";
    if (text.length <= PROSE_CUTOFF) return `<p>${esc(text)}</p>`;
    const cut = text.lastIndexOf(" ", PROSE_CUTOFF) > 0 ? text.lastIndexOf(" ", PROSE_CUTOFF) : PROSE_CUTOFF;
    return `
      <div class="ovh-prose">
        <span class="truncated">${esc(text.slice(0, cut))}…</span>
        <span class="full">${esc(text)}</span>
        <button type="button" class="ovh-prose-toggle">Read more</button>
      </div>
    `;
  }

  function render(character) {
    if (!character) return "";
    const { personality, backstory, notes } = character;
    if (!personality && !backstory && !notes) return "";

    return `
      <section class="ovh-section ovh-notes-section">
        <div class="ovh-section-header">
          <h2>Notes</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          ${personality ? `<p class="ovh-group-label">Personality</p><p>${esc(personality)}</p>` : ""}
          ${backstory ? `<p class="ovh-group-label">Backstory</p>${buildProseBlock(backstory)}` : ""}
          ${notes ? `<p class="ovh-group-label">DM Notes</p><p class="ovh-callout gm">${esc(notes)}</p>` : ""}
        </div>
      </section>
    `;
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".ovh-prose-toggle").forEach(btn => {
      if (btn.dataset.wired === "true") return;
      btn.dataset.wired = "true";
      btn.addEventListener("click", () => {
        const prose = btn.closest(".ovh-prose");
        if (!prose) return;
        const expanded = prose.classList.toggle("expanded");
        btn.textContent = expanded ? "Read less" : "Read more";
      });
    });
  }

  return { render, wireInteractive };

})();
