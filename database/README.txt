Aspen Grove Companion — database files
=====================================

What is here
------------
schema.mysql.sql      MySQL 8+ tables (used by the Node server when DATABASE_URL is mysql://…)
seed.mysql.sql        Service catalog rows (INSERT IGNORE; same slugs as ?service=)
mysql-config.js       Shared URL + SSL options for server.js and run-sql.js

Legacy / reference (not used by server.js)
------------------------------------------
schema.sqlite.sql     SQLite (optional local file DB)
seed.sql              SQLite seed
schema.postgresql.sql Previous Postgres schema (migration reference only)
seed.postgres.sql     Postgres seed (reference)
init-sqlite.ps1       Windows: builds aspen_grove.db if sqlite3 is on PATH

Tables
------
service_types      Ten services (slug matches booking/schedule/service pages)
care_requests      Care request form + intro call date/time + location preference
contact_leads      Home + about contact messages
scheduled_visits   Optional future rows for confirmed visits

MySQL (production / AwardSpace or any host)
--------------------------------------------
1. Create a MySQL database and user (AwardSpace: Hosting Panel → Database Manager).
2. Set DATABASE_URL to:
     mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME
   (mariadb://… is also accepted.)
3. From repo root (Node already installed):
     $env:DATABASE_URL = "mysql://…"; npm run db:init
   Local without TLS:  $env:MYSQL_SSL = "false"
   If remote MySQL is blocked, run `schema.mysql.sql` then `seed.mysql.sql` in phpMyAdmin.
4. Run Node wherever forms POST — use the same DATABASE_URL there. Static FTP
   hosts (e.g. AwardSpace) do not get node_modules; see DEPLOY-AWARDSPACE.txt.

The Node server uses MySQL when DATABASE_URL starts with mysql:// or mariadb://;
otherwise submissions go to ./data/*.jsonl. HTML pages only POST to the server.

SQLite quick start (optional, not wired to server)
--------------------------------------------------
  cd database
  powershell -ExecutionPolicy Bypass -File .\init-sqlite.ps1
