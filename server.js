/**
 * Serves the static site and accepts form POSTs.
 * If DATABASE_URL is a mysql:// or mariadb:// URI, submissions go to MySQL (see database/schema.mysql.sql).
 * Otherwise they are appended under ./data as JSONL (local testing without MySQL).
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const { mysql, normalizeDatabaseUrl, isMysqlUrl, mysqlPoolConfig } = require("./database/mysql-config");
const { sendHomePageContactEmail, getMailModeLabel } = require("./mail");
const { createAdminRouter } = require("./admin");

const app = express();
const ROOT = __dirname;
const DATA = path.join(ROOT, "data");

let pool = null;

function getPool() {
  let url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!url || !isMysqlUrl(url)) return null;
  if (!pool) {
    pool = mysql.createPool(mysqlPoolConfig(url));
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

async function resolveServiceTypeId(pool, slug) {
  const safe = /^[a-z0-9-]+$/.test(slug) ? slug : "companionship";
  let [rows] = await pool.query("SELECT id FROM service_types WHERE slug = ? LIMIT 1", [safe]);
  if (!rows[0]) {
    [rows] = await pool.query("SELECT id FROM service_types WHERE slug = ? LIMIT 1", ["companionship"]);
  }
  if (!rows[0]) {
    throw new Error("service_types has no rows; run database/seed.mysql.sql");
  }
  return rows[0].id;
}

async function insertContactHome(pool, body) {
  const fullName = str(body.full_name);
  const email = str(body.email);
  const phone = str(body.phone);
  const message = str(body.message);
  const composed =
    [email && `Email: ${email}`, phone && `Phone: ${phone}`, message && `Message:\n${message}`]
      .filter(Boolean)
      .join("\n") || "(no message)";
  await pool.query(
    `INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
     VALUES (?, ?, ?, ?, ?)`,
    [fullName || "Unknown", "Home page contact", null, null, composed]
  );
}

async function insertContactLead(pool, body) {
  await pool.query(
    `INSERT INTO contact_leads (caller_name, care_recipient_name, city_neighborhood, referral_source, message)
     VALUES (?, ?, ?, ?, ?)`,
    [
      str(body.caller_name) || "Unknown",
      str(body.care_recipient_name) || "Unknown",
      str(body.city_neighborhood),
      str(body.referral_source),
      str(body.message),
    ]
  );
}

async function insertCareRequest(pool, body) {
  const raw = String(body.service || "companionship").toLowerCase();
  const slug = /^[a-z0-9-]+$/.test(raw) ? raw : "companionship";
  const serviceTypeId = await resolveServiceTypeId(pool, slug);
  const introRaw = str(body.intro_date);
  const introDate = introRaw && /^\d{4}-\d{2}-\d{2}$/.test(introRaw) ? introRaw : null;
  await pool.query(
    `INSERT INTO care_requests (
      service_type_id, first_name, last_name, email, phone, country_region, address_line,
      city, postal_code, message, urgency, intro_date, intro_time, location_pref, expanded_evening
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      0,
    ]
  );
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/api/contact", async (req, res, next) => {
  try {
    const db = getPool();
    if (db) {
      await insertContactHome(db, req.body);
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
      await insertContactLead(db, req.body);
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
      await insertCareRequest(db, req.body);
    } else {
      appendJsonl("care-requests.jsonl", req.body);
    }
    const raw = String(req.body.service || "companionship").toLowerCase();
    const service = /^[a-z0-9-]+$/.test(raw) ? raw : "companionship";
    const qs = new URLSearchParams();
    qs.set("service", service);
    if (req.body.intro_date) qs.set("date", req.body.intro_date);
    if (req.body.intro_time) qs.set("time", req.body.intro_time);
    const locPref = str(req.body.location_pref);
    if (locPref && locPref !== "all") qs.set("location", locPref);
    res.redirect(303, `/thank-you.html?${qs.toString()}`);
  } catch (err) {
    next(err);
  }
});

app.use("/admin", createAdminRouter(getPool, DATA));

app.use(express.static(ROOT));

app.use((err, req, res, next) => {
  const code = err && err.code ? ` [${err.code}]` : "";
  console.error("Form / database error:%s", code, err);
  if (res.headersSent) {
    next(err);
    return;
  }
  if (req.originalUrl.startsWith("/admin/api")) {
    return res.status(500).json({ error: String(err.message || err) });
  }
  const isProd = process.env.NODE_ENV === "production";
  const safeDetail = isProd
    ? ""
    : `<pre style="white-space:pre-wrap;max-width:48rem">${String(err.message || err).replace(
        /</g,
        "&lt;"
      )}</pre><p style="font-size:13px;margin-top:1rem">Check <code>DATABASE_URL</code> (must be <code>mysql://…</code>), TLS (<code>MYSQL_SSL=false</code> for local), and that you ran <code>database/schema.mysql.sql</code> plus <code>database/seed.mysql.sql</code> (e.g. <code>npm run db:init</code>). MySQL error <code>1146</code> means a table is missing.</p>`;
  res
    .status(503)
    .type("html")
    .send(`<p>We could not save your message. Please try again or call us.</p>${safeDetail}`);
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const raw = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (raw && !isMysqlUrl(raw)) {
    console.warn(
      "DATABASE_URL is set but is not mysql:// or mariadb:// — forms will use JSONL (./data). Update the URL to MySQL."
    );
  }
  const mode = getPool() ? "MySQL" : "JSONL (./data)";
  const adminOn = process.env.ADMIN_PASSWORD && String(process.env.ADMIN_PASSWORD).trim() ? "yes" : "no";
  console.log(
    `Listening on http://localhost:${port} — forms: ${mode}; home email: ${getMailModeLabel()}; admin UI: /admin (ADMIN_PASSWORD set: ${adminOn})`
  );
});
