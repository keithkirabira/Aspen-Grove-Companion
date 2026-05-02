-- Aspen Grove Companion — SQLite schema
-- Apply: sqlite3 aspen_grove.db < schema.sqlite.sql && sqlite3 aspen_grove.db < seed.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS service_types (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS care_requests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type_id  INTEGER NOT NULL REFERENCES service_types (id),
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  country_region   TEXT,
  address_line     TEXT,
  city             TEXT,
  postal_code      TEXT,
  message          TEXT,
  urgency          TEXT,
  intro_date       TEXT,
  intro_time       TEXT,
  location_pref    TEXT,
  expanded_evening INTEGER NOT NULL DEFAULT 0 CHECK (expanded_evening IN (0, 1)),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'reviewing', 'confirmed', 'cancelled', 'completed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_care_requests_email ON care_requests (email);
CREATE INDEX IF NOT EXISTS idx_care_requests_status ON care_requests (status);
CREATE INDEX IF NOT EXISTS idx_care_requests_created ON care_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_care_requests_intro_date ON care_requests (intro_date);

CREATE TABLE IF NOT EXISTS contact_leads (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  caller_name          TEXT NOT NULL,
  care_recipient_name  TEXT NOT NULL,
  city_neighborhood    TEXT,
  referral_source      TEXT,
  message              TEXT,
  status               TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new', 'contacted', 'closed')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_status ON contact_leads (status);
CREATE INDEX IF NOT EXISTS idx_contact_leads_created ON contact_leads (created_at);

-- Optional: scheduled visits / manage-bookings (future UI)
CREATE TABLE IF NOT EXISTS scheduled_visits (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  care_request_id  INTEGER REFERENCES care_requests (id) ON DELETE SET NULL,
  service_type_id  INTEGER NOT NULL REFERENCES service_types (id),
  title            TEXT NOT NULL,
  starts_at        TEXT NOT NULL,
  ends_at          TEXT,
  service_address  TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_visits_starts ON scheduled_visits (starts_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_status ON scheduled_visits (status);
