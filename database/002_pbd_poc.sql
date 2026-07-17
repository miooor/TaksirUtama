CREATE TABLE IF NOT EXISTS academic_years (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year text NOT NULL CHECK (year ~ '^\\d{4}$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, year)
);

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS pbd_source_mode text NOT NULL DEFAULT 'google_sheets'
  CHECK (pbd_source_mode IN ('google_sheets', 'database'));

CREATE TABLE IF NOT EXISTS school_subjects (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  aliases_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE IF NOT EXISTS school_classes (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id text NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  level_kind text NOT NULL CHECK (level_kind IN ('tahun', 'tingkatan', 'peralihan')),
  level_number integer CHECK (level_number BETWEEN 1 AND 6),
  enrolled_count integer NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, name)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS database_pbd_periods (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id text NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester text NOT NULL CHECK (semester IN ('1', '2')),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, semester)
);

CREATE TABLE IF NOT EXISTS pbd_class_subject_entries (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id text NOT NULL REFERENCES database_pbd_periods(id) ON DELETE CASCADE,
  class_subject_id text NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  enrolled_count integer NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  tp1_count integer CHECK (tp1_count IS NULL OR tp1_count >= 0),
  tp2_count integer CHECK (tp2_count IS NULL OR tp2_count >= 0),
  tp3_count integer CHECK (tp3_count IS NULL OR tp3_count >= 0),
  tp4_count integer CHECK (tp4_count IS NULL OR tp4_count >= 0),
  tp5_count integer CHECK (tp5_count IS NULL OR tp5_count >= 0),
  tp6_count integer CHECK (tp6_count IS NULL OR tp6_count >= 0),
  not_assessed_count integer CHECK (not_assessed_count IS NULL OR not_assessed_count >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, period_id, class_subject_id)
);

CREATE TABLE IF NOT EXISTS pbd_entry_revisions (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entry_id text NOT NULL REFERENCES pbd_class_subject_entries(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'save_draft', 'finalize', 'reopen')),
  previous_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_classes_lookup ON school_classes (school_id, academic_year_id, active);
CREATE INDEX IF NOT EXISTS pbd_entries_period_lookup ON pbd_class_subject_entries (school_id, period_id, status);
