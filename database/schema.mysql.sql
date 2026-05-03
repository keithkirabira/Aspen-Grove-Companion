-- Aspen Grove Companion — MySQL 8+ schema (InnoDB, utf8mb4)
-- Apply: mysql ... < schema.mysql.sql && mysql ... < seed.mysql.sql
-- Or: npm run db:init   (with DATABASE_URL=mysql://...)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS service_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(190) NOT NULL,
  name VARCHAR(512) NOT NULL,
  subtitle TEXT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_types_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS care_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_type_id BIGINT UNSIGNED NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(64) NULL,
  country_region VARCHAR(128) NULL,
  address_line VARCHAR(512) NULL,
  city VARCHAR(128) NULL,
  postal_code VARCHAR(32) NULL,
  message TEXT NULL,
  urgency VARCHAR(64) NULL,
  intro_date DATE NULL,
  intro_time VARCHAR(64) NULL,
  location_pref VARCHAR(64) NULL,
  expanded_evening TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_care_requests_email (email),
  KEY idx_care_requests_status (status),
  KEY idx_care_requests_created (created_at),
  KEY idx_care_requests_intro_date (intro_date),
  CONSTRAINT chk_care_requests_status CHECK (
    status IN ('pending', 'reviewing', 'confirmed', 'cancelled', 'completed')
  ),
  CONSTRAINT fk_care_requests_service_type FOREIGN KEY (service_type_id) REFERENCES service_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  caller_name VARCHAR(512) NOT NULL,
  care_recipient_name VARCHAR(512) NOT NULL,
  city_neighborhood VARCHAR(255) NULL,
  referral_source VARCHAR(255) NULL,
  message TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_contact_leads_status (status),
  KEY idx_contact_leads_created (created_at),
  CONSTRAINT chk_contact_leads_status CHECK (status IN ('new', 'contacted', 'closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS scheduled_visits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_request_id BIGINT UNSIGNED NULL,
  service_type_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(512) NOT NULL,
  starts_at TIMESTAMP(6) NOT NULL,
  ends_at TIMESTAMP(6) NULL,
  service_address TEXT NULL,
  notes TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_scheduled_visits_starts (starts_at),
  KEY idx_scheduled_visits_status (status),
  CONSTRAINT chk_scheduled_visits_status CHECK (
    status IN ('scheduled', 'completed', 'cancelled', 'no_show')
  ),
  CONSTRAINT fk_scheduled_visits_care_request FOREIGN KEY (care_request_id) REFERENCES care_requests (id) ON DELETE SET NULL,
  CONSTRAINT fk_scheduled_visits_service_type FOREIGN KEY (service_type_id) REFERENCES service_types (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
