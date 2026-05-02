Aspen Grove Companion — database files
=====================================

What is here
------------
schema.sqlite.sql     SQLite tables (local dev, single file)
seed.sql              Service catalog rows (same slugs as the website ?service=)
schema.postgresql.sql Same model for PostgreSQL (Supabase, Neon, etc.)
seed.postgres.sql     Service catalog for Postgres (ON CONFLICT DO NOTHING)
init-sqlite.ps1       Windows: builds aspen_grove.db if sqlite3 is on PATH

Tables
------
service_types      Nine services (slug matches booking/schedule/service pages)
care_requests      Care request form + intro call date/time + location preference
contact_leads      Get In Touch form on about.html (when wired to a backend)
scheduled_visits   Optional future rows for manage-bookings / confirmed visits

SQLite quick start
------------------
  cd database
  powershell -ExecutionPolicy Bypass -File .\init-sqlite.ps1

Or manually:
  sqlite3 aspen_grove.db < schema.sqlite.sql
  sqlite3 aspen_grove.db < seed.sql

PostgreSQL
----------
  psql "$env:DATABASE_URL" -f schema.postgresql.sql
  psql "$env:DATABASE_URL" -f seed.postgres.sql

The Node server (server.js) uses DATABASE_URL when set: forms are inserted into
PostgreSQL; otherwise submissions go to ./data/*.jsonl. The HTML pages only POST
to the server; they do not connect to the database directly.
