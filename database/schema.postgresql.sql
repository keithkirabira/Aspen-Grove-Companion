-- Aspen Grove Companion — PostgreSQL schema (Supabase, Neon, RDS, etc.)
-- Apply: psql $DATABASE_URL -f schema.postgresql.sql && psql $DATABASE_URL -f seed.postgres.sql

CREATE TABLE IF NOT EXISTS service_types (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_requests (
  id               BIGSERIAL PRIMARY KEY,
  service_type_id  BIGINT NOT NULL REFERENCES service_types (id),
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
  intro_date       DATE,
  intro_time       TEXT,
  location_pref    TEXT,
  expanded_evening BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'reviewing', 'confirmed', 'cancelled', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_requests_email ON care_requests (email);
CREATE INDEX IF NOT EXISTS idx_care_requests_status ON care_requests (status);
CREATE INDEX IF NOT EXISTS idx_care_requests_created ON care_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_care_requests_intro_date ON care_requests (intro_date);

CREATE TABLE IF NOT EXISTS contact_leads (
  id                   BIGSERIAL PRIMARY KEY,
  caller_name          TEXT NOT NULL,
  care_recipient_name  TEXT NOT NULL,
  city_neighborhood    TEXT,
  referral_source      TEXT,
  message              TEXT,
  status               TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new', 'contacted', 'closed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_leads_status ON contact_leads (status);
CREATE INDEX IF NOT EXISTS idx_contact_leads_created ON contact_leads (created_at);

CREATE TABLE IF NOT EXISTS scheduled_visits (
  id               BIGSERIAL PRIMARY KEY,
  care_request_id  BIGINT REFERENCES care_requests (id) ON DELETE SET NULL,
  service_type_id  BIGINT NOT NULL REFERENCES service_types (id),
  title            TEXT NOT NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  service_address  TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_visits_starts ON scheduled_visits (starts_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_status ON scheduled_visits (status);
