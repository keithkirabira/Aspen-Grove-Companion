/**
 * How forms submit:
 *   "node" — POST to this site’s /api/... (default for npm start / Node behind reverse proxy).
 *           If static HTML is elsewhere, set AGC_API_BASE to your Node origin (no trailing slash).
 *   "php"  — POST to api/*.php on the same host (AwardSpace + MySQL, no Node).
 *
 * The file you may see under node_modules (TypeScript `import … from 'node:url'`) is only for
 * Node dependencies on your computer — it is never uploaded with the website and does not run in the browser.
 */
window.AGC_FORM_BACKEND = "node";
window.AGC_API_BASE = "";

(function () {
  var backend = typeof window.AGC_FORM_BACKEND === "string" ? window.AGC_FORM_BACKEND.trim().toLowerCase() : "node";

  if (backend === "php") {
    document.querySelectorAll('form[action^="/api/"]').forEach(function (form) {
      var action = form.getAttribute("action");
      if (action === "/api/contact") {
        form.setAttribute("action", "api/contact.php");
      } else if (action === "/api/contact-lead") {
        form.setAttribute("action", "api/contact-lead.php");
      } else if (action === "/api/care-request") {
        form.setAttribute("action", "api/care-request.php");
      }
    });
    return;
  }

  var base = typeof window.AGC_API_BASE === "string" ? window.AGC_API_BASE.trim().replace(/\/$/, "") : "";
  if (!base) {
    return;
  }
  document.querySelectorAll('form[action^="/api/"]').forEach(function (form) {
    var action = form.getAttribute("action");
    if (action && action.indexOf("/api/") === 0) {
      form.setAttribute("action", base + action);
    }
  });
})();
