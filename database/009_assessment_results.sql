-- Assessment results: persistent UPSA/UASA marks in Neon.
-- Stores parsed marks from Google Sheets so that slips and analysis
-- can be served from the database without a runtime Sheets dependency.

CREATE TABLE IF NOT EXISTS assessment_results (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id text NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN ('upsa', 'uasa')),
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
  enrollment_id text NOT NULL REFERENCES student_class_enrolments(id) ON DELETE RESTRICT,
  student_id text NOT NULL REFERENCES school_students(id) ON DELETE RESTRICT,
  subject_code text NOT NULL,
  mark numeric(6, 2),
  max_mark integer NOT NULL DEFAULT 100,
  grade text,
  status text NOT NULL CHECK (status IN ('marked', 'missing', 'absent')),
  source_sheet text,
  source_row integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, assessment_type, enrollment_id, subject_code)
);

CREATE INDEX IF NOT EXISTS assessment_results_class_lookup
  ON assessment_results (school_id, academic_year_id, assessment_type, class_id);

CREATE INDEX IF NOT EXISTS assessment_results_student_lookup
  ON assessment_results (school_id, student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS assessment_results_period_lookup
  ON assessment_results (school_id, academic_year_id, assessment_type);
