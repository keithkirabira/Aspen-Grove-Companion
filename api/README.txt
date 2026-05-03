PHP form handlers (AwardSpace / shared hosting)
===============================================

These scripts insert into the same MySQL tables as server.js (see
database/schema.mysql.sql).

Setup
-----
1. Create MySQL database and user in your hosting panel.
2. Run schema + seed in phpMyAdmin (paste database/schema.mysql.sql then
   database/seed.mysql.sql), or use npm run db:init from a machine that can reach
   the database.
3. Copy config.sample.php to config.local.php and set host, database name,
   user, and password.
4. FTP the whole `api/` folder next to index.html (not inside node_modules).
5. In assets/api-base.js set:
     window.AGC_FORM_BACKEND = "php";
   Leave window.AGC_API_BASE = "" for PHP on the same site.

Do not commit config.local.php (it is listed in .gitignore).
