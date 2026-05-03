/**
 * Shared MySQL connection options for server.js and run-sql.js.
 */
const mysql = require("mysql2/promise");

function normalizeDatabaseUrl(raw) {
  let u = String(raw || "").trim();
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1);
  }
  return u;
}

function isMysqlUrl(connectionString) {
  const s = String(connectionString).toLowerCase();
  return s.startsWith("mysql://") || s.startsWith("mysql2://") || s.startsWith("mariadb://");
}

/** Parse mysql:// or mariadb:// into mysql2 pool options. */
function mysqlPoolConfig(connectionString) {
  const normalized = String(connectionString).replace(/^mysql2:/i, "mysql:");
  const u = new URL(normalized.replace(/^mariadb:/i, "mysql:"));
  const host = u.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  const pathDb = (u.pathname || "/").replace(/^\//, "");
  const database = decodeURIComponent(pathDb.split("?")[0] || "");
  const cfg = {
    host,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username || ""),
    password: decodeURIComponent(u.password || ""),
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  if (!isLocal && process.env.MYSQL_SSL !== "false") {
    const strict = process.env.MYSQL_SSL_REJECT_UNAUTHORIZED === "true";
    cfg.ssl = strict ? { rejectUnauthorized: true } : { rejectUnauthorized: false };
  }
  return cfg;
}

module.exports = { mysql, normalizeDatabaseUrl, isMysqlUrl, mysqlPoolConfig };
