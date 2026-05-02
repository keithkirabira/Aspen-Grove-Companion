/**
 * Outbound email for home-page contact notifications.
 *
 * Render FREE web services block outbound SMTP (ports 25, 465, 587) — Gmail/SMTP
 * will time out (ETIMEDOUT). Use HTTPS instead:
 *
 *   SENDGRID_API_KEY  → SendGrid Web API (port 443). Create at app.sendgrid.com
 *   EMAIL_FROM        → verified sender in SendGrid
 *
 * Or:
 *   RESEND_API_KEY + RESEND_FROM (or EMAIL_FROM) → https://resend.com
 *
 * SMTP (nodemailer) still works on paid hosts / local dev / providers that allow SMTP.
 */
const nodemailer = require("nodemailer");

const DEFAULT_NOTIFY_TO = "solomon.bagambe1011@gmail.com";
const SUBJECT = "Aspen Grove — New home page contact";

function buildMessage(body) {
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
  const replyTo = email !== "(none)" ? email : null;
  return { text, replyTo };
}

function buildHostTransportOptions() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const explicit = process.env.SMTP_SECURE?.trim();
  const mode = (explicit || (port === 465 ? "ssl" : "tls")).toLowerCase();

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
  return Boolean(
    process.env.SENDGRID_API_KEY?.trim() ||
      process.env.RESEND_API_KEY?.trim() ||
      process.env.SMTP_URL?.trim() ||
      process.env.SMTP_HOST?.trim()
  );
}

async function sendViaSendGridApi({ text, replyTo }) {
  const key = process.env.SENDGRID_API_KEY?.trim();
  if (!key) return null;

  const to = process.env.EMAIL_TO?.trim() || DEFAULT_NOTIFY_TO;
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    return { sent: false, reason: "EMAIL_FROM required for SendGrid API" };
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from },
    subject: SUBJECT,
    content: [{ type: "text/plain", value: text }],
  };
  if (replyTo) {
    payload.reply_to = { email: replyTo };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`SendGrid API ${res.status}: ${errBody.slice(0, 400)}`);
  }
  return { sent: true };
}

async function sendViaResendApi({ text, replyTo }) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;

  const to = process.env.EMAIL_TO?.trim() || DEFAULT_NOTIFY_TO;
  const from = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM?.trim();
  if (!from) {
    return { sent: false, reason: "RESEND_FROM or EMAIL_FROM required for Resend" };
  }

  const payload = {
    from,
    to: [to],
    subject: SUBJECT,
    text,
  };
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || JSON.stringify(data).slice(0, 400);
    throw new Error(`Resend API ${res.status}: ${msg}`);
  }
  return { sent: true };
}

async function sendViaSmtp({ text, replyTo }) {
  const transport = getTransport();
  if (!transport) {
    return { sent: false, reason: "SMTP not configured (set SMTP_URL or SMTP_HOST)" };
  }
  const to = process.env.EMAIL_TO?.trim() || DEFAULT_NOTIFY_TO;
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) {
    return { sent: false, reason: "Set EMAIL_FROM or SMTP_USER for the From address" };
  }

  await transport.sendMail({
    from,
    to,
    replyTo: replyTo || undefined,
    subject: SUBJECT,
    text,
  });
  return { sent: true };
}

/**
 * Prefers HTTPS APIs (works on Render Free). Falls back to SMTP.
 */
async function sendHomePageContactEmail(body) {
  const msg = buildMessage(body);

  if (process.env.SENDGRID_API_KEY?.trim()) {
    return sendViaSendGridApi(msg);
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResendApi(msg);
  }
  return sendViaSmtp(msg);
}

/** Human-readable mode for startup logs */
function getMailModeLabel() {
  if (process.env.SENDGRID_API_KEY?.trim()) return "SendGrid API (HTTPS)";
  if (process.env.RESEND_API_KEY?.trim()) return "Resend API (HTTPS)";
  if (isMailConfigured()) return "SMTP";
  return "off (no SENDGRID_API_KEY, RESEND_API_KEY, or SMTP)";
}

module.exports = { sendHomePageContactEmail, isMailConfigured, getMailModeLabel };
