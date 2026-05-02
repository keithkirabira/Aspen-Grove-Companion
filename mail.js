/**
 * Outbound email for form notifications (nodemailer + SMTP).
 * Configure SMTP_URL or SMTP_HOST (+ SMTP_USER / SMTP_PASS) on Render.
 */
const nodemailer = require("nodemailer");

const DEFAULT_NOTIFY_TO = "solomon.bagambe1011@gmail.com";

function getTransport() {
  const smtpUrl = process.env.SMTP_URL?.trim();
  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER != null && String(process.env.SMTP_USER).length
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
  });
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
