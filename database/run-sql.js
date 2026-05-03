/**
 * Apply MySQL schema + seed (no mysql CLI required).
 * From repo root:
 *   $env:DATABASE_URL = "mysql://USER:PASSWORD@HOST:3306/DATABASE" ; npm run db:init
 *
 * Local (no TLS): set MYSQL_SSL=false
 * Hosting: see DEPLOY-AWARDSPACE.txt (repo root).
 */
const fs = require("fs");
const path = require("path");
const { mysql, normalizeDatabaseUrl, isMysqlUrl, mysqlPoolConfig } = require("./mysql-config");

async function runFile(conn, label, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  console.log("Running %s …", label);
  await conn.query(sql);
  console.log("Done: %s", label);
}

async function main() {
  const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!connectionString || !isMysqlUrl(connectionString)) {
    console.error(
      "Missing or invalid DATABASE_URL for MySQL. Example:\n" +
        '  PowerShell:  $env:DATABASE_URL = "mysql://user:pass@localhost:3306/aspen_grove"; npm run db:init\n' +
        "Local without TLS:  $env:MYSQL_SSL = \"false\""
    );
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, "schema.mysql.sql");
  const seedPath = path.join(__dirname, "seed.mysql.sql");
  for (const p of [schemaPath, seedPath]) {
    if (!fs.existsSync(p)) {
      console.error("File not found: %s", p);
      process.exit(1);
    }
  }

  const cfg = { ...mysqlPoolConfig(connectionString), multipleStatements: true };
  delete cfg.waitForConnections;
  delete cfg.connectionLimit;
  delete cfg.queueLimit;

  const conn = await mysql.createConnection(cfg);
  try {
    await runFile(conn, "schema (schema.mysql.sql)", schemaPath);
    await runFile(conn, "seed (seed.mysql.sql)", seedPath);
  } finally {
    await conn.end();
  }
  console.log("Database is ready for the web service.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
