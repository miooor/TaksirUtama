CREATE TABLE IF NOT EXISTS school_students (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  pupil_code text,
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_students_pupil_code_unique
  ON school_students (school_id, upper(pupil_code))
  WHERE pupil_code IS NOT NULL AND pupil_code <> '';

CREATE INDEX IF NOT EXISTS school_students_name_lookup
  ON school_students (school_id, normalized_name, active);

CREATE TABLE IF NOT EXISTS student_class_enrolments (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id text NOT NULL REFERENCES school_students(id) ON DELETE RESTRICT,
  academic_year_id text NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  class_id text NOT NULL REFERENCES school_classes(id) ON DELETE RESTRICT,
  roster_number integer CHECK (roster_number IS NULL OR roster_number > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, academic_year_id, student_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS student_class_enrolments_roster_number_unique
  ON student_class_enrolments (school_id, class_id, roster_number)
  WHERE roster_number IS NOT NULL AND active = true;

CREATE INDEX IF NOT EXISTS student_class_enrolments_class_lookup
  ON student_class_enrolments (school_id, academic_year_id, class_id, active);

CREATE TABLE IF NOT EXISTS pbd_student_interventions (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  period_id text NOT NULL REFERENCES database_pbd_periods(id) ON DELETE CASCADE,
  class_subject_id text NOT NULL REFERENCES class_subjects(id) ON DELETE RESTRICT,
  class_enrolment_id text NOT NULL REFERENCES student_class_enrolments(id) ON DELETE RESTRICT,
  student_id text NOT NULL REFERENCES school_students(id) ON DELETE RESTRICT,
  tp_level integer NOT NULL CHECK (tp_level IN (1, 2)),
  problem text NOT NULL CHECK (char_length(problem) BETWEEN 1 AND 2000),
  intervention text NOT NULL CHECK (char_length(intervention) BETWEEN 1 AND 2000),
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, period_id, class_subject_id, class_enrolment_id)
);

CREATE INDEX IF NOT EXISTS pbd_student_interventions_period_lookup
  ON pbd_student_interventions (school_id, period_id, active);

CREATE INDEX IF NOT EXISTS pbd_student_interventions_student_lookup
  ON pbd_student_interventions (school_id, student_id, period_id);

CREATE TABLE IF NOT EXISTS pbd_intervention_revisions (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  intervention_id text NOT NULL REFERENCES pbd_student_interventions(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'archive', 'restore')),
  previous_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION save_pbd_student_intervention(
  p_entry_id text,
  p_revision_id text,
  p_school_id text,
  p_actor_id text,
  p_period_id text,
  p_class_subject_id text,
  p_class_enrolment_id text,
  p_expected_revision integer,
  p_tp_level integer,
  p_problem text,
  p_intervention text
) RETURNS TABLE(id text, revision integer, changed boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing pbd_student_interventions%ROWTYPE;
  v_student_id text;
  v_next_revision integer;
  v_next jsonb;
BEGIN
  IF p_tp_level NOT IN (1, 2) OR char_length(trim(p_problem)) NOT BETWEEN 1 AND 2000
    OR char_length(trim(p_intervention)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Maklumat intervensi tidak sah.';
  END IF;

  SELECT e.student_id INTO v_student_id
  FROM student_class_enrolments e
  JOIN school_students st ON st.id = e.student_id AND st.school_id = p_school_id AND st.active = true
  JOIN class_subjects cs ON cs.id = p_class_subject_id AND cs.school_id = p_school_id AND cs.active = true
  JOIN school_classes c ON c.id = cs.class_id AND c.id = e.class_id AND c.school_id = p_school_id AND c.active = true
  JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = p_school_id AND s.active = true
  JOIN database_pbd_periods period ON period.id = p_period_id AND period.school_id = p_school_id
    AND period.academic_year_id = e.academic_year_id AND period.status IN ('draft', 'open')
  WHERE e.id = p_class_enrolment_id AND e.school_id = p_school_id AND e.active = true;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Murid, kelas atau subjek tidak lagi aktif.';
  END IF;

  SELECT * INTO v_existing
  FROM pbd_student_interventions item
  WHERE item.school_id = p_school_id AND item.period_id = p_period_id
    AND item.class_subject_id = p_class_subject_id AND item.class_enrolment_id = p_class_enrolment_id
  FOR UPDATE;

  IF v_existing.id IS NULL THEN
    IF p_expected_revision <> 0 THEN
      RAISE EXCEPTION 'Rekod intervensi telah berubah. Muat semula dan cuba lagi.' USING ERRCODE = '40001';
    END IF;
    INSERT INTO pbd_student_interventions (
      id, school_id, period_id, class_subject_id, class_enrolment_id, student_id,
      tp_level, problem, intervention, updated_by
    ) VALUES (
      p_entry_id, p_school_id, p_period_id, p_class_subject_id, p_class_enrolment_id, v_student_id,
      p_tp_level, trim(p_problem), trim(p_intervention), p_actor_id
    );
    v_next := jsonb_build_object('tpLevel', p_tp_level, 'problem', trim(p_problem), 'intervention', trim(p_intervention), 'active', true, 'revision', 1);
    INSERT INTO pbd_intervention_revisions (id, school_id, intervention_id, actor_id, action, previous_json, next_json)
      VALUES (p_revision_id, p_school_id, p_entry_id, p_actor_id, 'create', '{}'::jsonb, v_next);
    RETURN QUERY SELECT p_entry_id, 1, true;
    RETURN;
  END IF;

  IF v_existing.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Rekod intervensi telah berubah. Muat semula dan cuba lagi.' USING ERRCODE = '40001';
  END IF;
  IF NOT v_existing.active THEN
    RAISE EXCEPTION 'Pulihkan rekod yang diarkibkan sebelum mengubahnya.';
  END IF;
  IF v_existing.tp_level = p_tp_level AND v_existing.problem = trim(p_problem)
    AND v_existing.intervention = trim(p_intervention) THEN
    RETURN QUERY SELECT v_existing.id, v_existing.revision, false;
    RETURN;
  END IF;

  v_next_revision := v_existing.revision + 1;
  UPDATE pbd_student_interventions item SET
    tp_level = p_tp_level,
    problem = trim(p_problem),
    intervention = trim(p_intervention),
    revision = v_next_revision,
    updated_by = p_actor_id,
    updated_at = now()
  WHERE item.id = v_existing.id AND item.school_id = p_school_id;
  v_next := jsonb_build_object('tpLevel', p_tp_level, 'problem', trim(p_problem), 'intervention', trim(p_intervention), 'active', true, 'revision', v_next_revision);
  INSERT INTO pbd_intervention_revisions (id, school_id, intervention_id, actor_id, action, previous_json, next_json)
    VALUES (p_revision_id, p_school_id, v_existing.id, p_actor_id, 'update', to_jsonb(v_existing), v_next);
  RETURN QUERY SELECT v_existing.id, v_next_revision, true;
END;
$$;

CREATE OR REPLACE FUNCTION set_pbd_student_intervention_active(
  p_revision_id text,
  p_school_id text,
  p_actor_id text,
  p_intervention_id text,
  p_expected_revision integer,
  p_active boolean
) RETURNS TABLE(id text, revision integer, changed boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing pbd_student_interventions%ROWTYPE;
  v_next_revision integer;
  v_action text;
BEGIN
  SELECT * INTO v_existing FROM pbd_student_interventions item
  WHERE item.id = p_intervention_id AND item.school_id = p_school_id FOR UPDATE;
  IF v_existing.id IS NULL THEN RAISE EXCEPTION 'Rekod intervensi tidak ditemui.'; END IF;
  IF v_existing.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Rekod intervensi telah berubah. Muat semula dan cuba lagi.' USING ERRCODE = '40001';
  END IF;
  IF v_existing.active = p_active THEN
    RETURN QUERY SELECT v_existing.id, v_existing.revision, false;
    RETURN;
  END IF;
  IF p_active AND NOT EXISTS (
    SELECT 1 FROM student_class_enrolments e
    JOIN class_subjects cs ON cs.id = v_existing.class_subject_id AND cs.class_id = e.class_id
    JOIN school_classes c ON c.id = cs.class_id AND c.active = true
    JOIN school_subjects s ON s.id = cs.subject_id AND s.active = true
    WHERE e.id = v_existing.class_enrolment_id AND e.school_id = p_school_id AND e.active = true AND cs.active = true
  ) THEN RAISE EXCEPTION 'Rekod tidak boleh dipulihkan kerana murid, kelas atau subjek tidak aktif.'; END IF;

  v_next_revision := v_existing.revision + 1;
  v_action := CASE WHEN p_active THEN 'restore' ELSE 'archive' END;
  UPDATE pbd_student_interventions item SET active = p_active, revision = v_next_revision,
    updated_by = p_actor_id, updated_at = now()
  WHERE item.id = p_intervention_id AND item.school_id = p_school_id;
  INSERT INTO pbd_intervention_revisions (id, school_id, intervention_id, actor_id, action, previous_json, next_json)
    VALUES (p_revision_id, p_school_id, p_intervention_id, p_actor_id, v_action, to_jsonb(v_existing),
      jsonb_build_object('active', p_active, 'revision', v_next_revision));
  RETURN QUERY SELECT p_intervention_id, v_next_revision, true;
END;
$$;
