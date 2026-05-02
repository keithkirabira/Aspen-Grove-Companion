/**
 * Serves the static site and accepts form POSTs.
 * If DATABASE_URL is set, submissions go to PostgreSQL (see database/schema.postgresql.sql).
 * Otherwise they are appended under ./data as JSONL (local testing without Postgres).
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { sendHomePageContactEmail, getMailModeLabel } = require("./mail");

const app = express();
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");

let pool = null;

function isLocalPostgresUrl(url) {
  // Avoid parsing the URL (passwords may contain @ or :); match host segment only.
  return /@localhost(?::|\/|$)/i.test(url) || /@127\.0\.0\.1(?::|\/|$)/i.test(url) || /@\[::1\](?::|\/|$)/i.test(url);
}

function createPoolConfig(connectionString) {
  const cfg = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };
  const url = connectionString.toLowerCase();
  const wantsSsl =
    url.includes("sslmode=require") ||
    url.includes("sslmode=verify-full") ||
    url.includes("sslmode=verify-ca") ||
    process.env.PGSSLMODE === "require";
  const isLocal = isLocalPostgresUrl(connectionString);
  // Managed Postgres (Render, Neon, Supabase, RDS, etc.) uses TLS; Node often needs
  // rejectUnauthorized: false unless you install the provider CA (see PGSSL_REJECT_UNAUTHORIZED).
  if (!isLocal && (wantsSsl || process.env.DATABASE_SSL !== "false")) {
    const strict = process.env.PGSSL_REJECT_UNAUTHORIZED === "true";
    cfg.ssl = strict ? { rejectUnauthorized: true } : { rejectUnauthorized: false };
  }
  return cfg;
}

function getPool() {
  let url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (!url) return null;
  // Strip accidental wrapping quotes from some dashboards
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  if (!pool) {
    pool = new Pool(createPoolConfig(url));
  }
  return pool;
}

function appendJsonl(filename, payload) {
  fs.mkdirSync(DATA, { recursive: true });
  const line = JSON.stringify({ ...payload, savedAt: new Date().toISOString() }) + "\n";
  fs.appendFileSync(path.join(DATA, filename), line, "utf8");
}

function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

async function resolveServiceTypeId(client, slug) {
  const safe = /^[a-z0-9-]+$/.test(slug) ? slug : "companionship";
  let r = await client.query("SELECT id FROM service_types WHERE slug = $1 LIMIT 1", [safe]);
  if (!r.rows[0]) {
    r = await client.query("SELECT id FROM service_types WHERE slug = $1 LIMIT 1", ["companionship"]);
  }
  if (!r.rows[0]) {
    throw new Error("service_types has no rows; run database/seed.postgres.sql");
  }
  return r.rows[0].id;
}

async function insertContactHome(client, body) {
  const fullName = str(body.full_name);
  const email = str(body.email);
  const phone = str(body.phone);
  const message = str(body.message);
  const composed =
    [email && `Email: ${email}`, phone && `Phone: ${phone}`, message && `Message:\n${message}`]
      .filter(Boolean)
      .join("\n") || "(no message)";
  await client.query(
    `INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [fullName || "Unknown", "Home page contact", null, null, composed]
  );
}

async function insertContactLead(client, body) {
  await client.query(
    `INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      str(body.caller_name) || "Unknown",
      str(body.care_recipient_name) || "Unknown",
      str(body.city_neighborhood),
      str(body.referral_source),
      str(body.message),
    ]
  );
}

async function insertCareRequest(client, body) {
  const raw = String(body.service || "companionship").toLowerCase();
  const slug = /^[a-z0-9-]+$/.test(raw) ? raw : "companionship";
  const serviceTypeId = await resolveServiceTypeId(client, slug);
  const introRaw = str(body.intro_date);
  const introDate = introRaw && /^\d{4}-\d{2}-\d{2}$/.test(introRaw) ? introRaw : null;
  await client.query(
    `INSERT INTO care_requests (
      service_type_id, first_name, last_name, email, phone, country_region, address_line,
      city, postal_code, message, urgency, intro_date, intro_time, location_pref, expanded_evening
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      serviceTypeId,
      str(body.first_name) || "",
      str(body.last_name) || "",
      str(body.email) || "",
      str(body.phone),
      str(body.country_region),
      str(body.address_line),
      str(body.city),
      str(body.postal_code),
      str(body.message),
      str(body.urgency),
      introDate,
      str(body.intro_time),
      str(body.location_pref),
      false,
    ]
  );
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/api/contact", async (req, res, next) => {
  try {
    const db = getPool();
    if (db) {
      const client = await db.connect();
      try {
        await insertContactHome(client, req.body);
      } finally {
        client.release();
      }
    } else {
      appendJsonl("contact.jsonl", req.body);
    }
    try {
      const mailResult = await sendHomePageContactEmail(req.body);
      if (!mailResult.sent && mailResult.reason) {
        console.warn("Home contact email:", mailResult.reason);
      }
    } catch (mailErr) {
      console.error("Home contact email failed:", mailErr);
    }
    res.redirect(303, "/thank-you.html?from=contact");
  } catch (err) {
    next(err);
  }
});

app.post("/api/contact-lead", async (req, res, next) => {
  try {
    const db = getPool();
    if (db) {
      const client = await db.connect();
      try {
        await insertContactLead(client, req.body);
      } finally {
        client.release();
      }
    } else {
      appendJsonl("contact-leads.jsonl", req.body);
    }
    res.redirect(303, "/thank-you.html?from=contact");
  } catch (err) {
    next(err);
  }
});

app.post("/api/care-request", async (req, res, next) => {
  try {
    const db = getPool();
    if (db) {
      const client = await db.connect();
      try {
        await insertCareRequest(client, req.body);
      } finally {
        client.release();
      }
    } else {
      appendJsonl("care-requests.jsonl", req.body);
    }
    const raw = String(req.body.service || "companionship").toLowerCase();
    const service = /^[a-z0-9-]+$/.test(raw) ? raw : "companionship";
    const qs = new URLSearchParams();
    qs.set("service", service);
    if (req.body.intro_date) qs.set("date", req.body.intro_date);
    if (req.body.intro_time) qs.set("time", req.body.intro_time);
    res.redirect(303, `/thank-you.html?${qs.toString()}`);
  } catch (err) {
    next(err);
  }
});

app.use(express.static(ROOT));

app.use((err, req, res, next) => {
  const code = err && err.code ? ` [${err.code}]` : "";
  console.error("Form / database error:%s", code, err);
  if (res.headersSent) {
    next(err);
    return;
  }
  const isProd = process.env.NODE_ENV === "production";
  const safeDetail = isProd
    ? ""
    : `<pre style="white-space:pre-wrap;max-width:48rem">${String(err.message || err).replace(
        /</g,
        "&lt;"
      )}</pre><p style="font-size:13px;margin-top:1rem">Check <code>DATABASE_URL</code>, SSL (try <code>PGSSL_REJECT_UNAUTHORIZED=false</code> only if your host requires it), and that you ran <code>database/schema.postgresql.sql</code> plus <code>database/seed.postgres.sql</code>. PostgreSQL code <code>42P01</code> means a table is missing.</p>`;
  res
    .status(503)
    .type("html")
    .send(`<p>We could not save your message. Please try again or call us.</p>${safeDetail}`);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const mode = getPool() ? "PostgreSQL" : "JSONL (./data)";
  console.log(`Listening on http://localhost:${port} — forms: ${mode}; home email: ${getMailModeLabel()}`);
});
