/**
 * view-character-notes.js
 * Notes shell renderer.
 */

const ViewCharacterNotes = (() => {

  const esc = ViewCharacterUtils.esc;

  function render(notes) {
    if (!notes) return "";
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📝 Notes</h2>
        <div class="sheet-prose sheet-notes">${esc(notes)}</div>
      </section>
    `;
  }

  return { render };

})();
