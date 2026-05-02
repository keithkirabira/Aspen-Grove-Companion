/**
 * Apply schema + seed without the psql CLI.
 * Usage (from repo root):
 *   set DATABASE_URL=postgresql://...   (cmd.exe)
 *   $env:DATABASE_URL = "postgresql://..." ; npm run db:init   (PowerShell)
 *
 * Copy DATABASE_URL from Render → your PostgreSQL → Connections (External URL
 * works from your laptop; Internal URL only works inside Render's network).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function normalizeDatabaseUrl(raw) {
  let u = String(raw || "").trim();
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1);
  }
  return u;
}

function isLocalPostgresUrl(url) {
  return /@localhost(?::|\/|$)/i.test(url) || /@127\.0\.0\.1(?::|\/|$)/i.test(url) || /@\[::1\](?::|\/|$)/i.test(url);
}

function clientConfig(connectionString) {
  const cfg = { connectionString };
  const lower = connectionString.toLowerCase();
  const wantsSsl =
    lower.includes("sslmode=require") ||
    lower.includes("sslmode=verify-full") ||
    lower.includes("sslmode=verify-ca") ||
    process.env.PGSSLMODE === "require";
  const isLocal = isLocalPostgresUrl(connectionString);
  if (!isLocal && (wantsSsl || process.env.DATABASE_SSL !== "false")) {
    const strict = process.env.PGSSL_REJECT_UNAUTHORIZED === "true";
    cfg.ssl = strict ? { rejectUnauthorized: true } : { rejectUnauthorized: false };
  }
  return cfg;
}

async function runFile(client, label, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  console.log("Running %s …", label);
  await client.query(sql);
  console.log("Done: %s", label);
}

async function main() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString) {
    console.error(
      "Missing DATABASE_URL. Paste your Render Postgres *External* connection string, then:\n" +
        "  PowerShell:  $env:DATABASE_URL = \"postgresql://…\"; npm run db:init\n" +
        "  cmd.exe:     set DATABASE_URL=postgresql://… && npm run db:init"
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "schema.postgresql.sql");
  const seedPath = path.join(__dirname, "seed.postgres.sql");
  for (const p of [schemaPath, seedPath]) {
    if (!fs.existsSync(p)) {
      console.error("File not found: %s", p);
      process.exit(1);
    }
  }

  const client = new Client(clientConfig(connectionString));
  await client.connect();
  try {
    await runFile(client, "schema (schema.postgresql.sql)", schemaPath);
    await runFile(client, "seed (seed.postgres.sql)", seedPath);
  } finally {
    await client.end();
  }
  console.log("Database is ready for the web service.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
