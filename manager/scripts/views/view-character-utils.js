/**
 * view-character-utils.js
 * Shared HTML escaping helpers for the sheet renderer modules.
 */

const ViewCharacterUtils = (() => {

  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  return {
    esc,
    escAttr,
  };

})();
