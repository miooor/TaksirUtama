CREATE TABLE IF NOT EXISTS schools (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  clerk_organization_id text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'archived')),
  config_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_memberships (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('school_admin', 'teacher', 'viewer', 'platform_admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, clerk_user_id)
);

CREATE TABLE IF NOT EXISTS teaching_assignments (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  class_name text,
  subject_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workbook_sources (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year text NOT NULL CHECK (year ~ '^\\d{4}$'),
  type text NOT NULL CHECK (type IN ('upsa', 'uasa', 'pbd')),
  spreadsheet_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('draft', 'active', 'disabled')),
  readiness_status text NOT NULL CHECK (readiness_status IN ('checking', 'ready', 'warning', 'fatal', 'inaccessible')),
  schema_version text,
  fingerprint text,
  findings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at timestamptz,
  last_successful_read_at timestamptz,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workbook_sources_one_active
  ON workbook_sources (school_id, year, type)
  WHERE state = 'active';

CREATE INDEX IF NOT EXISTS workbook_sources_school_period
  ON workbook_sources (school_id, year, type, state);

CREATE TABLE IF NOT EXISTS readiness_runs (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  workbook_source_id text REFERENCES workbook_sources(id) ON DELETE SET NULL,
  status text NOT NULL,
  fingerprint text,
  warning_count integer NOT NULL DEFAULT 0,
  fatal_count integer NOT NULL DEFAULT 0,
  findings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_fingerprints (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  workbook_source_id text REFERENCES workbook_sources(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  school_id text REFERENCES schools(id) ON DELETE SET NULL,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  outcome text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_school_created
  ON audit_events (school_id, created_at DESC);
