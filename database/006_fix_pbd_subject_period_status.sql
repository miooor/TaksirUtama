DO $$
DECLARE
  function_definition text;
  old_predicate text := 'WHERE id = p_period_id AND school_id = p_school_id AND status IN';
  fixed_predicate text := 'WHERE database_pbd_periods.id = p_period_id AND database_pbd_periods.school_id = p_school_id AND database_pbd_periods.status IN';
BEGIN
  SELECT pg_get_functiondef(
    'pbd_save_subject_entries(text,text,text,text,jsonb,text,text)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(function_definition, old_predicate, fixed_predicate);

  IF position('database_pbd_periods.status IN' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'pbd_save_subject_entries period status predicate could not be qualified';
  END IF;

  EXECUTE function_definition;
END;
$$;
