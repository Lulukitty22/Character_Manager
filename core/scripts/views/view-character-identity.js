/**
 * view-character-identity.js
 * Identity, appearance gallery, and info rows.
 * Personality + backstory moved to view-character-notes.js.
 * Relationships deferred — will become a dedicated top-level tab.
 */

const ViewCharacterIdentity = (() => {

  const esc = ViewCharacterUtils.esc;
  const escAttr = ViewCharacterUtils.escAttr;

  const SVG_DIV = `<svg viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg>`;

  function render(identity, appearance, character) {
    const infoFields = [
      ["Race",   identity.race],
      ["Age",    identity.age],
      ["Height", identity.height],
      ["Origin", identity.origin],
    ].filter(([, value]) => value);

    const tags = identity.tags || [];
    const images = (appearance.images || []).filter(img => img.url);

    const hasContent = infoFields.length || tags.length || images.length || appearance.description;
    if (!hasContent) return "";

    const galleryHTML = buildGallery(images);

    const descHTML = appearance.description
      ? `<p class="ovh-appearance-desc">${esc(appearance.description)}</p>`
      : "";

    const identityRowsHTML = infoFields.length ? `
      <div class="ovh-identity-rows">
        ${infoFields.map(([k, v]) => `
          <div class="ovh-row">
            <span class="k">${esc(k)}</span>
            <span class="v">${esc(v)}</span>
          </div>`).join("")}
      </div>` : "";

    const tagRowHTML = tags.length ? `
      <div class="ovh-tag-row">
        ${tags.map(tag => {
          const tone = tag.toLowerCase() === "provisional" ? " tone-warn" : "";
          return `<span class="ovh-tag${tone}">${esc(tag)}</span>`;
        }).join("")}
      </div>` : "";

    return `
      <section class="ovh-section ovh-identity-section">
        <div class="ovh-section-header">
          <h2>Identity</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          ${galleryHTML}
          ${descHTML}
          ${identityRowsHTML}
          ${tagRowHTML}
          <p class="ovh-deferred-note">Relationships — coming as a dedicated tab</p>
        </div>
      </section>
    `;
  }

  function buildGallery(images) {
    if (!images.length) return "";

    const groups = {};
    for (const img of images) {
      const key = img.variant || img.set || "default";
      (groups[key] = groups[key] || []).push(img);
    }
    const groupKeys = Object.keys(groups);
    const firstGroup = groups[groupKeys[0]];
    const mainImg = firstGroup[0];

    const tabsHTML = groupKeys.length > 1 ? `
      <div class="ovh-appearance-tabs">
        ${groupKeys.map((key, i) => `
          <button type="button" class="ovh-appearance-tab${i === 0 ? " active" : ""}" data-appearance="${escAttr(key)}">${esc(key)}</button>`).join("")}
      </div>` : "";

    const thumbsHTML = firstGroup.length > 1 ? `
      <div class="ovh-gallery-thumbs">
        ${firstGroup.map((img, i) => `
          <button type="button" class="ovh-gallery-thumb${i === 0 ? " active" : ""}" data-src="${escAttr(img.url)}">
            <img src="${escAttr(img.url)}" alt="${escAttr(img.label || "")}" loading="lazy" />
          </button>`).join("")}
      </div>` : "";

    return `
      ${tabsHTML}
      <div class="ovh-gallery">
        <div class="ovh-gallery-main">
          <img src="${escAttr(mainImg.url)}" alt="${escAttr(mainImg.label || "")}" loading="lazy" />
        </div>
        ${thumbsHTML}
      </div>`;
  }

  return { render };

})();
