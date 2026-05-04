/**
 * view-character-identity.js
 * Identity, appearance, personality, and backstory rendering.
 */

const ViewCharacterIdentity = (() => {

  const esc = ViewCharacterUtils.esc;
  const escAttr = ViewCharacterUtils.escAttr;

  function render(identity, appearance, character) {
    const infoFields = [
      ["Race",   identity.race],
      ["Age",    identity.age],
      ["Height", identity.height],
      ["Origin", identity.origin],
    ].filter(([, value]) => value);

    const identityRows = infoFields.map(([label, value]) =>
      `<div class="sheet-identity-row">
        <span class="sheet-identity-label">${label}</span>
        <span class="sheet-identity-value">${esc(value)}</span>
      </div>`
    ).join("");

    const images = (appearance.images || []).filter(img => img.url);
    const imageGallery = images.length
      ? `<div class="sheet-image-gallery">${images.map(img => `
          <figure class="sheet-image-figure">
            <img src="${escAttr(img.url)}" alt="${escAttr(img.label || "")}" class="sheet-image" loading="lazy" />
            ${img.label ? `<figcaption class="sheet-image-caption">${esc(img.label)}</figcaption>` : ""}
          </figure>`).join("")}</div>`
      : "";

    const hasContent = identityRows || imageGallery || appearance.description
                       || character.personality || character.backstory;
    if (!hasContent) return "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📖 Identity</h2>
        ${identityRows ? `<div class="sheet-identity-grid">${identityRows}</div>` : ""}
        ${imageGallery}
        ${appearance.description ? `<div class="sheet-prose"><strong>Appearance:</strong> ${esc(appearance.description)}</div>` : ""}
        ${character.personality ? `<div class="sheet-prose"><strong>Personality:</strong> ${esc(character.personality)}</div>` : ""}
        ${character.backstory ? `<div class="sheet-prose"><strong>Backstory:</strong> ${esc(character.backstory)}</div>` : ""}
      </section>
    `;
  }

  return { render };

})();
