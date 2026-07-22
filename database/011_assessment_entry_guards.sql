-- Atomic optimistic-concurrency guard for assessment entry saves.
--
-- saveAssessmentMarks() must validate the expected revision and draft status
-- AND hold the row lock through the mark writes. Neon transactions are
-- non-interactive (a batch of pre-built statements), so the read-validate-write
-- cannot be done from application code inside one transaction. This function
-- performs the SELECT ... FOR UPDATE plus the revision/status validation as a
-- single statement that runs first in the write transaction: it locks the row
-- for the rest of the transaction and raises (aborting the transaction) when
-- the draft has moved on or been finalised.

CREATE OR REPLACE FUNCTION assert_assessment_entry_revision(
  p_school_id text,
  p_academic_year_id text,
  p_assessment_type text,
  p_class_id text,
  p_subject_id text,
  p_expected_revision integer
) RETURNS text AS $$
DECLARE
  v_id text;
  v_revision integer;
  v_status text;
BEGIN
  SELECT id, revision, status INTO v_id, v_revision, v_status
  FROM assessment_entry_status
  WHERE school_id = p_school_id
    AND academic_year_id = p_academic_year_id
    AND assessment_type = p_assessment_type
    AND class_id = p_class_id
    AND subject_id = p_subject_id
  FOR UPDATE;

  -- No draft yet: only a client that believes there is no draft (revision 0)
  -- may proceed to create one.
  IF v_id IS NULL THEN
    IF p_expected_revision <> 0 THEN
      RAISE EXCEPTION 'Rekod telah dikemas kini oleh pengguna lain. Muat semula halaman.';
    END IF;
    RETURN NULL;
  END IF;

  IF v_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Rekod telah dikemas kini oleh pengguna lain. Muat semula halaman.';
  END IF;

  IF v_status = 'final' THEN
    RAISE EXCEPTION 'Buka semula rekod muktamad sebelum mengubahnya.';
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
