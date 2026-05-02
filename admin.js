/**
 * Password-protected admin UI + JSON APIs under /admin.
 * Set ADMIN_PASSWORD (and optional ADMIN_USER, default "admin").
 */
const express = require("express");
const fs = require("fs");
const path = require("path");

const JSONL_WHITELIST = new Set(["contact", "contact-leads", "care-requests"]);

function requireAdminAuth(req, res, next) {
  const pass = process.env.ADMIN_PASSWORD && String(process.env.ADMIN_PASSWORD).trim();
  if (!pass) {
    if (req.originalUrl.includes("/admin/api")) {
      return res.status(503).json({ error: "Set ADMIN_PASSWORD on the server to enable admin APIs." });
    }
    return res
      .status(503)
      .type("html")
      .send(
        "<p>Admin is disabled. Set <code>ADMIN_PASSWORD</code> (and redeploy), then open this URL again.</p>"
      );
  }
  const user = (process.env.ADMIN_USER && String(process.env.ADMIN_USER).trim()) || "admin";
  const hdr = req.headers.authorization || "";
  if (!hdr.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aspen Grove Admin"');
    return res.status(401).send("Authentication required");
  }
  let decoded;
  try {
    decoded = Buffer.from(hdr.slice(6), "base64").toString("utf8");
  } catch {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aspen Grove Admin"');
    return res.status(401).send("Invalid credentials");
  }
  const colon = decoded.indexOf(":");
  const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
  const p = colon >= 0 ? decoded.slice(colon + 1) : "";
  if (u !== user || p !== pass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aspen Grove Admin"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}

function createAdminRouter(getPool, dataDir) {
  const router = express.Router();
  router.use(requireAdminAuth);

  router.get("/api/overview", async (req, res, next) => {
    try {
      const db = getPool();
      if (!db) {
        return res.json({
          database: false,
          counts: null,
          hint: "DATABASE_URL not set — form data is in ./data JSONL. Use JSONL endpoints below.",
        });
      }
      const client = await db.connect();
      try {
        const [cl, cr, sv] = await Promise.all([
          client.query("SELECT COUNT(*)::int AS n FROM contact_leads"),
          client.query("SELECT COUNT(*)::int AS n FROM care_requests"),
          client.query("SELECT COUNT(*)::int AS n FROM scheduled_visits"),
        ]);
        res.json({
          database: true,
          counts: {
            contact_leads: cl.rows[0].n,
            care_requests: cr.rows[0].n,
            scheduled_visits: sv.rows[0].n,
          },
        });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/contact-leads", async (req, res, next) => {
    try {
      const db = getPool();
      if (!db) {
        return res.status(503).json({ error: "No database", rows: [] });
      }
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "200"), 10) || 200));
      const client = await db.connect();
      try {
        const r = await client.query(
          `SELECT id, caller_name, care_recipient_name, city_neighborhood, referral_source, message, status, created_at
           FROM contact_leads ORDER BY created_at DESC LIMIT $1`,
          [limit]
        );
        res.json({ rows: r.rows });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/care-requests", async (req, res, next) => {
    try {
      const db = getPool();
      if (!db) {
        return res.status(503).json({ error: "No database", rows: [] });
      }
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "200"), 10) || 200));
      const client = await db.connect();
      try {
        const r = await client.query(
          `SELECT cr.id, cr.first_name, cr.last_name, cr.email, cr.phone, cr.country_region, cr.address_line,
                  cr.city, cr.postal_code, cr.message, cr.urgency, cr.intro_date, cr.intro_time, cr.location_pref,
                  cr.expanded_evening, cr.status, cr.created_at, cr.updated_at,
                  st.slug AS service_slug, st.name AS service_name
           FROM care_requests cr
           JOIN service_types st ON st.id = cr.service_type_id
           ORDER BY cr.created_at DESC
           LIMIT $1`,
          [limit]
        );
        res.json({ rows: r.rows });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });

  router.get("/api/scheduled-visits", async (req, res, next) => {
    try {
      const db = getPool();
      if (!db) {
        return res.status(503).json({ error: "No database", rows: [] });
      }
      const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100));
      const client = await db.connect();
      try {
        const r = await client.query(
          `SELECT sv.id, sv.title, sv.starts_at, sv.ends_at, sv.service_address, sv.notes, sv.status, sv.created_at,
                  st.slug AS service_slug, st.name AS service_name,
                  sv.care_request_id
           FROM scheduled_visits sv
           JOIN service_types st ON st.id = sv.service_type_id
           ORDER BY sv.starts_at DESC NULLS LAST
           LIMIT $1`,
          [limit]
        );
        res.json({ rows: r.rows });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });

  router.get("/", (req, res) => {
    res.redirect(302, "/admin/index.html");
  });

  router.get("/api/jsonl/:name", (req, res) => {
    const key = req.params.name;
    if (!JSONL_WHITELIST.has(key)) {
      return res.status(400).json({ error: "Unknown export" });
    }
    const filePath = path.join(dataDir, `${key}.jsonl`);
    if (!fs.existsSync(filePath)) {
      return res.json({ rows: [], file: `${key}.jsonl` });
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const rows = [];
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try {
        rows.push(JSON.parse(t));
      } catch {
        rows.push({ parseError: true, raw: t.slice(0, 500) });
      }
    }
    rows.reverse();
    res.json({ rows: rows.slice(0, 400), file: `${key}.jsonl`, source: "jsonl" });
  });

  router.use(express.static(path.join(__dirname, "admin")));
  return router;
}

module.exports = { createAdminRouter };
