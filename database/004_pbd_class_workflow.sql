ALTER TABLE pbd_entry_revisions DROP CONSTRAINT IF EXISTS pbd_entry_revisions_action_check;
ALTER TABLE pbd_entry_revisions
  ADD CONSTRAINT pbd_entry_revisions_action_check
  CHECK (action IN ('create', 'save_draft', 'finalize', 'reopen', 'enrolment_sync'));

CREATE OR REPLACE FUNCTION pbd_save_class_entries(
  p_school_id text,
  p_period_id text,
  p_class_id text,
  p_actor_id text,
  p_entries jsonb,
  p_finalize_class_subject_id text DEFAULT NULL,
  p_reopen_class_subject_id text DEFAULT NULL
)
RETURNS TABLE (
  class_subject_id text,
  entry_id text,
  revision integer,
  status text,
  enrolled_count integer,
  changed boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  payload record;
  current_entry record;
  target_count integer;
  assignment_count integer;
  entered_total integer;
  action_name text;
  next_status text;
  changed_row boolean;
  created_entry_id text;
  changed_ids jsonb := '[]'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM database_pbd_periods
    WHERE id = p_period_id AND school_id = p_school_id AND status IN ('draft', 'open')
  ) THEN
    RAISE EXCEPTION 'Tempoh PBD tidak sah atau telah ditutup.';
  END IF;

  PERFORM 1 FROM school_classes
  WHERE id = p_class_id AND school_id = p_school_id AND active = true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kelas tidak ditemui atau telah diarkibkan.'; END IF;

  SELECT count(*) INTO assignment_count
  FROM class_subjects cs
  JOIN school_subjects s ON s.id = cs.subject_id AND s.active = true
  WHERE cs.school_id = p_school_id AND cs.class_id = p_class_id AND cs.active = true;
  SELECT count(*) INTO target_count FROM jsonb_array_elements(p_entries);
  IF assignment_count <> target_count THEN RAISE EXCEPTION 'Senarai subjek telah berubah. Muat semula sebelum menyimpan.'; END IF;

  FOR payload IN
    SELECT * FROM jsonb_to_recordset(p_entries) AS p(
      class_subject_id text, expected_revision integer,
      tp1 integer, tp2 integer, tp3 integer, tp4 integer, tp5 integer, tp6 integer, not_assessed integer
    )
  LOOP
    SELECT cs.id, c.enrolled_count AS class_enrolled_count, e.*
    INTO current_entry
    FROM class_subjects cs
    JOIN school_classes c ON c.id = cs.class_id AND c.school_id = p_school_id AND c.active = true
    JOIN school_subjects s ON s.id = cs.subject_id AND s.school_id = p_school_id AND s.active = true
    LEFT JOIN pbd_class_subject_entries e ON e.class_subject_id = cs.id AND e.period_id = p_period_id AND e.school_id = p_school_id
    WHERE cs.id = payload.class_subject_id AND cs.school_id = p_school_id AND cs.class_id = p_class_id AND cs.active = true
    FOR UPDATE OF cs;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subjek kelas tidak sah atau telah diarkibkan.'; END IF;
    IF COALESCE(current_entry.revision, 0) <> payload.expected_revision THEN
      RAISE EXCEPTION 'Rekod telah dikemas kini. Muat semula sebelum menyimpan.';
    END IF;
    IF current_entry.id IS NOT NULL AND current_entry.status = 'final' AND payload.class_subject_id <> p_reopen_class_subject_id THEN
      IF current_entry.tp1_count IS DISTINCT FROM payload.tp1 OR current_entry.tp2_count IS DISTINCT FROM payload.tp2
        OR current_entry.tp3_count IS DISTINCT FROM payload.tp3 OR current_entry.tp4_count IS DISTINCT FROM payload.tp4
        OR current_entry.tp5_count IS DISTINCT FROM payload.tp5 OR current_entry.tp6_count IS DISTINCT FROM payload.tp6
        OR current_entry.not_assessed_count IS DISTINCT FROM payload.not_assessed THEN
        RAISE EXCEPTION 'Buka semula rekod muktamad sebelum mengubahnya.';
      END IF;
    END IF;
  END LOOP;

  IF p_finalize_class_subject_id IS NOT NULL THEN
    SELECT tp1 + tp2 + tp3 + tp4 + tp5 + tp6 + not_assessed, c.enrolled_count
    INTO entered_total, target_count
    FROM jsonb_to_recordset(p_entries) AS p(class_subject_id text, expected_revision integer, tp1 integer, tp2 integer, tp3 integer, tp4 integer, tp5 integer, tp6 integer, not_assessed integer)
    JOIN class_subjects cs ON cs.id = p.class_subject_id AND cs.school_id = p_school_id AND cs.class_id = p_class_id AND cs.active = true
    JOIN school_classes c ON c.id = cs.class_id
    WHERE p.class_subject_id = p_finalize_class_subject_id;
    IF entered_total IS NULL OR entered_total <> target_count THEN
      RAISE EXCEPTION 'Lengkapkan semua nilai TP dan pastikan jumlahnya sama dengan jumlah murid.';
    END IF;
  END IF;

  FOR payload IN
    SELECT * FROM jsonb_to_recordset(p_entries) AS p(
      class_subject_id text, expected_revision integer,
      tp1 integer, tp2 integer, tp3 integer, tp4 integer, tp5 integer, tp6 integer, not_assessed integer
    )
  LOOP
    SELECT c.enrolled_count AS class_enrolled_count, e.* INTO current_entry
    FROM class_subjects cs
    JOIN school_classes c ON c.id = cs.class_id
    LEFT JOIN pbd_class_subject_entries e ON e.class_subject_id = cs.id AND e.period_id = p_period_id AND e.school_id = p_school_id
    WHERE cs.id = payload.class_subject_id;
    next_status := CASE
      WHEN payload.class_subject_id = p_finalize_class_subject_id THEN 'final'
      WHEN payload.class_subject_id = p_reopen_class_subject_id THEN 'draft'
      WHEN current_entry.id IS NOT NULL THEN current_entry.status
      ELSE 'draft'
    END;
    changed_row := current_entry.id IS NULL
      OR current_entry.enrolled_count IS DISTINCT FROM current_entry.class_enrolled_count
      OR current_entry.tp1_count IS DISTINCT FROM payload.tp1 OR current_entry.tp2_count IS DISTINCT FROM payload.tp2
      OR current_entry.tp3_count IS DISTINCT FROM payload.tp3 OR current_entry.tp4_count IS DISTINCT FROM payload.tp4
      OR current_entry.tp5_count IS DISTINCT FROM payload.tp5 OR current_entry.tp6_count IS DISTINCT FROM payload.tp6
      OR current_entry.not_assessed_count IS DISTINCT FROM payload.not_assessed OR current_entry.status IS DISTINCT FROM next_status;
    IF current_entry.id IS NULL AND payload.tp1 IS NULL AND payload.tp2 IS NULL AND payload.tp3 IS NULL AND payload.tp4 IS NULL
      AND payload.tp5 IS NULL AND payload.tp6 IS NULL AND payload.not_assessed IS NULL AND next_status = 'draft' THEN
      changed_row := false;
    END IF;
    IF changed_row THEN
      changed_ids := changed_ids || to_jsonb(payload.class_subject_id);
      IF current_entry.id IS NULL THEN
        created_entry_id := gen_random_uuid()::text;
        INSERT INTO pbd_class_subject_entries (id, school_id, period_id, class_subject_id, enrolled_count, tp1_count, tp2_count, tp3_count, tp4_count, tp5_count, tp6_count, not_assessed_count, status, revision, updated_by)
        VALUES (created_entry_id, p_school_id, p_period_id, payload.class_subject_id, current_entry.class_enrolled_count, payload.tp1, payload.tp2, payload.tp3, payload.tp4, payload.tp5, payload.tp6, payload.not_assessed, next_status, 1, p_actor_id);
        INSERT INTO pbd_entry_revisions (id, school_id, entry_id, actor_id, action, previous_json, next_json)
        VALUES (gen_random_uuid()::text, p_school_id, created_entry_id, p_actor_id, 'create', '{}'::jsonb,
          jsonb_build_object('enrolledCount', current_entry.class_enrolled_count, 'tp1', payload.tp1, 'tp2', payload.tp2, 'tp3', payload.tp3, 'tp4', payload.tp4, 'tp5', payload.tp5, 'tp6', payload.tp6, 'notAssessed', payload.not_assessed, 'status', next_status));
      ELSE
        action_name := CASE WHEN payload.class_subject_id = p_finalize_class_subject_id THEN 'finalize' WHEN payload.class_subject_id = p_reopen_class_subject_id THEN 'reopen' ELSE 'save_draft' END;
        UPDATE pbd_class_subject_entries
        SET enrolled_count = current_entry.class_enrolled_count, tp1_count = payload.tp1, tp2_count = payload.tp2, tp3_count = payload.tp3, tp4_count = payload.tp4, tp5_count = payload.tp5, tp6_count = payload.tp6, not_assessed_count = payload.not_assessed, status = next_status, revision = revision + 1, updated_by = p_actor_id, updated_at = now()
        WHERE id = current_entry.id;
        INSERT INTO pbd_entry_revisions (id, school_id, entry_id, actor_id, action, previous_json, next_json)
        VALUES (gen_random_uuid()::text, p_school_id, current_entry.id, p_actor_id, action_name,
          jsonb_build_object('enrolledCount', current_entry.enrolled_count, 'tp1', current_entry.tp1_count, 'tp2', current_entry.tp2_count, 'tp3', current_entry.tp3_count, 'tp4', current_entry.tp4_count, 'tp5', current_entry.tp5_count, 'tp6', current_entry.tp6_count, 'notAssessed', current_entry.not_assessed_count, 'status', current_entry.status),
          jsonb_build_object('enrolledCount', current_entry.class_enrolled_count, 'tp1', payload.tp1, 'tp2', payload.tp2, 'tp3', payload.tp3, 'tp4', payload.tp4, 'tp5', payload.tp5, 'tp6', payload.tp6, 'notAssessed', payload.not_assessed, 'status', next_status));
      END IF;
    END IF;
  END LOOP;
  RETURN QUERY
    SELECT cs.id, e.id, COALESCE(e.revision, 0), COALESCE(e.status, 'draft'), c.enrolled_count,
      cs.id IN (SELECT jsonb_array_elements_text(changed_ids))
    FROM class_subjects cs JOIN school_classes c ON c.id = cs.class_id
    LEFT JOIN pbd_class_subject_entries e ON e.class_subject_id = cs.id AND e.period_id = p_period_id AND e.school_id = p_school_id
    WHERE cs.school_id = p_school_id AND cs.class_id = p_class_id AND cs.active = true
    ORDER BY cs.id;
END;
$$;
