-- Assessment entry workflow: track draft/finalize status per class+subject+period.
-- Mirrors the pbd_class_subject_entries pattern for optimistic concurrency.

CREATE TABLE IF NOT EXISTS assessment_entry_status (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id text NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN ('upsa', 'uasa')),
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
  enrolled_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  revision integer NOT NULL DEFAULT 1,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, assessment_type, class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS aes_period_lookup
  ON assessment_entry_status (school_id, academic_year_id, assessment_type, status);

-- Revision audit trail (mirrors pbd_entry_revisions)
CREATE TABLE IF NOT EXISTS assessment_entry_revisions (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entry_status_id text NOT NULL REFERENCES assessment_entry_status(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('save_draft', 'finalize', 'reopen')),
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure level_number constraint supports SMK Tingkatan 1-5 (already fits 1-6)
ALTER TABLE school_classes
  DROP CONSTRAINT IF EXISTS school_classes_level_number_check;
ALTER TABLE school_classes
  ADD CONSTRAINT school_classes_level_number_check
  CHECK (level_number BETWEEN 1 AND 6);
