/**
 * Form submit target:
 *   "node" — POST to /api/... (Express). Use on localhost when running npm start.
 *   "php"  — POST to api/*.php (AwardSpace + MySQL).
 *
 * Leave AGC_FORM_BACKEND as "" for automatic mode:
 *   localhost / 127.0.0.1 / ::1  →  "node"
 *   any real domain (e.g. your .ca site)  →  "php"
 *
 * Override: set window.AGC_FORM_BACKEND = "node" or "php" before this file (edit the line below).
 *
 * If you use Node on another host instead of PHP, set AGC_FORM_BACKEND = "node" and set AGC_API_BASE
 * to that server’s origin (no trailing slash), and set PUBLIC_SITE_URL on Node for thank-you redirects.
 */
window.AGC_FORM_BACKEND = "";
window.AGC_API_BASE = "";

(function () {
  var host = (window.location.hostname || "").toLowerCase();
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";

  var explicit = typeof window.AGC_FORM_BACKEND === "string" ? window.AGC_FORM_BACKEND.trim().toLowerCase() : "";
  var backend =
    explicit === "node" || explicit === "php"
      ? explicit
      : isLocal
        ? "node"
        : "php";

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
