/**
 * Outbound email for form notifications (nodemailer + SMTP).
 *
 * Gmail-style (same idea as PHPMailer: isSMTP, smtp.gmail.com, 587, TLS):
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=tls
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-google-app-password
 *   EMAIL_FROM=your-email@gmail.com
 *
 * Or set SMTP_URL (e.g. SendGrid) instead of the discrete vars above.
 */
const nodemailer = require("nodemailer");

const DEFAULT_NOTIFY_TO = "solomon.bagambe1011@gmail.com";

function buildHostTransportOptions() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const explicit = process.env.SMTP_SECURE?.trim();
  const mode = (explicit || (port === 465 ? "ssl" : "tls")).toLowerCase();

  // PHPMailer: SMTPSecure = 'ssl' / port 465  →  nodemailer secure: true
  // PHPMailer: SMTPSecure = 'tls' / port 587  →  nodemailer secure: false + STARTTLS
  let secure = false;
  let requireTLS = false;
  if (mode === "ssl" || mode === "smtps" || mode === "true" || mode === "1") {
    secure = true;
  } else if (mode === "tls" || mode === "starttls") {
    secure = false;
    requireTLS = process.env.SMTP_REQUIRE_TLS !== "false";
  } else if (mode === "false" || mode === "0") {
    secure = false;
  } else {
    secure = port === 465;
    if (!secure && port === 587) {
      requireTLS = process.env.SMTP_REQUIRE_TLS !== "false";
    }
  }

  const opts = {
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER != null && String(process.env.SMTP_USER).length
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
  };
  if (requireTLS) {
    opts.requireTLS = true;
  }
  return opts;
}

function getTransport() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  return nodemailer.createTransport(buildHostTransportOptions());
}

function isMailConfigured() {
  return Boolean(process.env.SMTP_URL?.trim() || process.env.SMTP_HOST?.trim());
}

/**
 * Sends a plain-text summary of the home page contact form.
 * Does not throw if SMTP is not configured (logs once-style skip).
 */
async function sendHomePageContactEmail(body) {
  const transport = getTransport();
  if (!transport) {
    return { sent: false, reason: "SMTP not configured (set SMTP_URL or SMTP_HOST)" };
  }
  const to = process.env.EMAIL_TO?.trim() || DEFAULT_NOTIFY_TO;
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) {
    return { sent: false, reason: "Set EMAIL_FROM or SMTP_USER for the From address" };
  }

  const name = String(body.full_name || "").trim() || "(no name)";
  const email = String(body.email || "").trim() || "(none)";
  const phone = String(body.phone || "").trim() || "(none)";
  const message = String(body.message || "").trim() || "(empty)";
  const text = [
    "New message from the Aspen Grove home page contact form.",
    "",
    `Full name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    "",
    "Message:",
    message,
    "",
    `Submitted at (server): ${new Date().toISOString()}`,
  ].join("\n");

  const replyTo = email !== "(none)" ? email : undefined;
  await transport.sendMail({
    from,
    to,
    replyTo,
    subject: "Aspen Grove — New home page contact",
    text,
  });
  return { sent: true };
}

module.exports = { sendHomePageContactEmail, isMailConfigured };
