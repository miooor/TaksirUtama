-- 012: PBD Intervention Status Workflow
-- Adds lifecycle columns, composite index, and revises save/archive functions.

-- 1. Add lifecycle columns
ALTER TABLE pbd_student_interventions
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'planned'
    CHECK (workflow_status IN ('planned', 'in_progress', 'needs_review', 'completed'));

ALTER TABLE pbd_student_interventions
  ADD COLUMN IF NOT EXISTS review_due_on date;

ALTER TABLE pbd_student_interventions
  ADD COLUMN IF NOT EXISTS follow_up_note text
    CHECK (follow_up_note IS NULL OR char_length(follow_up_note) BETWEEN 1 AND 2000);

ALTER TABLE pbd_student_interventions
  ADD COLUMN IF NOT EXISTS reviewed_on date;

-- 2. Composite index for work queue queries
CREATE INDEX IF NOT EXISTS pbd_student_interventions_workflow_lookup
  ON pbd_student_interventions (school_id, period_id, workflow_status, review_due_on)
  WHERE active = true;

-- 3. Widen action CHECK to allow 'status_change'
ALTER TABLE pbd_intervention_revisions
  DROP CONSTRAINT IF EXISTS pbd_intervention_revisions_action_check;

ALTER TABLE pbd_intervention_revisions
  ADD CONSTRAINT pbd_intervention_revisions_action_check
  CHECK (action IN ('create', 'update', 'archive', 'restore', 'status_change'));

-- 4. Revise save function with lifecycle parameters
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
  p_intervention text,
  p_workflow_status text DEFAULT 'planned',
  p_review_due_on date DEFAULT NULL,
  p_follow_up_note text DEFAULT NULL,
  p_reviewed_on date DEFAULT NULL
) RETURNS TABLE(id text, revision integer, changed boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing pbd_student_interventions%ROWTYPE;
  v_student_id text;
  v_next_revision integer;
  v_next jsonb;
  v_action text;
BEGIN
  -- Validate basic fields
  IF p_tp_level NOT IN (1, 2) OR char_length(trim(p_problem)) NOT BETWEEN 1 AND 2000
    OR char_length(trim(p_intervention)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Maklumat intervensi tidak sah.';
  END IF;

  -- Validate workflow status
  IF p_workflow_status NOT IN ('planned', 'in_progress', 'needs_review', 'completed') THEN
    RAISE EXCEPTION 'Status aliran kerja tidak sah.';
  END IF;

  -- Validate follow_up_note length if provided
  IF p_follow_up_note IS NOT NULL AND char_length(trim(p_follow_up_note)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Nota susulan tidak sah.';
  END IF;

  -- Completion guard: require follow_up_note and review_due_on
  IF p_workflow_status = 'completed' THEN
    IF p_follow_up_note IS NULL OR char_length(trim(p_follow_up_note)) = 0 THEN
      RAISE EXCEPTION 'Nota susulan diperlukan sebelum menandakan intervensi sebagai selesai.';
    END IF;
    IF p_review_due_on IS NULL THEN
      RAISE EXCEPTION 'Tarikh semakan diperlukan sebelum menandakan intervensi sebagai selesai.';
    END IF;
  END IF;

  -- Verify student/class/subject are active and period is valid
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

  -- Lock existing record
  SELECT * INTO v_existing
  FROM pbd_student_interventions item
  WHERE item.school_id = p_school_id AND item.period_id = p_period_id
    AND item.class_subject_id = p_class_subject_id AND item.class_enrolment_id = p_class_enrolment_id
  FOR UPDATE;

  -- INSERT path
  IF v_existing.id IS NULL THEN
    IF p_expected_revision <> 0 THEN
      RAISE EXCEPTION 'Rekod intervensi telah berubah. Muat semula dan cuba lagi.' USING ERRCODE = '40001';
    END IF;
    INSERT INTO pbd_student_interventions (
      id, school_id, period_id, class_subject_id, class_enrolment_id, student_id,
      tp_level, problem, intervention, workflow_status, review_due_on, follow_up_note, reviewed_on, updated_by
    ) VALUES (
      p_entry_id, p_school_id, p_period_id, p_class_subject_id, p_class_enrolment_id, v_student_id,
      p_tp_level, trim(p_problem), trim(p_intervention), p_workflow_status, p_review_due_on,
      CASE WHEN p_follow_up_note IS NOT NULL THEN trim(p_follow_up_note) ELSE NULL END,
      p_reviewed_on, p_actor_id
    );
    v_next := jsonb_build_object(
      'tpLevel', p_tp_level, 'problem', trim(p_problem), 'intervention', trim(p_intervention),
      'workflowStatus', p_workflow_status, 'reviewDueOn', p_review_due_on,
      'followUpNote', CASE WHEN p_follow_up_note IS NOT NULL THEN trim(p_follow_up_note) ELSE NULL END,
      'reviewedOn', p_reviewed_on, 'active', true, 'revision', 1
    );
    INSERT INTO pbd_intervention_revisions (id, school_id, intervention_id, actor_id, action, previous_json, next_json)
      VALUES (p_revision_id, p_school_id, p_entry_id, p_actor_id, 'create', '{}'::jsonb, v_next);
    RETURN QUERY SELECT p_entry_id, 1, true;
    RETURN;
  END IF;

  -- UPDATE path: optimistic concurrency check
  IF v_existing.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Rekod intervensi telah berubah. Muat semula dan cuba lagi.' USING ERRCODE = '40001';
  END IF;
  IF NOT v_existing.active THEN
    RAISE EXCEPTION 'Pulihkan rekod yang diarkibkan sebelum mengubahnya.';
  END IF;

  -- No-change short-circuit
  IF v_existing.tp_level = p_tp_level AND v_existing.problem = trim(p_problem)
    AND v_existing.intervention = trim(p_intervention)
    AND v_existing.workflow_status = p_workflow_status
    AND v_existing.review_due_on IS NOT DISTINCT FROM p_review_due_on
    AND v_existing.follow_up_note IS NOT DISTINCT FROM (CASE WHEN p_follow_up_note IS NOT NULL THEN trim(p_follow_up_note) ELSE NULL END)
    AND v_existing.reviewed_on IS NOT DISTINCT FROM p_reviewed_on THEN
    RETURN QUERY SELECT v_existing.id, v_existing.revision, false;
    RETURN;
  END IF;

  v_next_revision := v_existing.revision + 1;
  v_action := CASE WHEN v_existing.workflow_status <> p_workflow_status THEN 'status_change' ELSE 'update' END;

  UPDATE pbd_student_interventions item SET
    tp_level = p_tp_level,
    problem = trim(p_problem),
    intervention = trim(p_intervention),
    workflow_status = p_workflow_status,
    review_due_on = p_review_due_on,
    follow_up_note = CASE WHEN p_follow_up_note IS NOT NULL THEN trim(p_follow_up_note) ELSE NULL END,
    reviewed_on = p_reviewed_on,
    revision = v_next_revision,
    updated_by = p_actor_id,
    updated_at = now()
  WHERE item.id = v_existing.id AND item.school_id = p_school_id;

  v_next := jsonb_build_object(
    'tpLevel', p_tp_level, 'problem', trim(p_problem), 'intervention', trim(p_intervention),
    'workflowStatus', p_workflow_status, 'reviewDueOn', p_review_due_on,
    'followUpNote', CASE WHEN p_follow_up_note IS NOT NULL THEN trim(p_follow_up_note) ELSE NULL END,
    'reviewedOn', p_reviewed_on, 'active', true, 'revision', v_next_revision
  );
  INSERT INTO pbd_intervention_revisions (id, school_id, intervention_id, actor_id, action, previous_json, next_json)
    VALUES (p_revision_id, p_school_id, v_existing.id, p_actor_id, v_action, to_jsonb(v_existing), v_next);
  RETURN QUERY SELECT v_existing.id, v_next_revision, true;
END;
$$;

-- 5. Revise archive/restore function to include lifecycle fields in revision JSON
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
      jsonb_build_object(
        'active', p_active, 'revision', v_next_revision,
        'workflowStatus', v_existing.workflow_status, 'reviewDueOn', v_existing.review_due_on,
        'followUpNote', v_existing.follow_up_note, 'reviewedOn', v_existing.reviewed_on
      ));
  RETURN QUERY SELECT p_intervention_id, v_next_revision, true;
END;
$$;
