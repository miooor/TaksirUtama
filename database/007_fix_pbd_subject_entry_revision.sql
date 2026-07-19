DO $$
DECLARE
  function_definition text;
  old_expression text := 'revision = revision + 1';
  fixed_expression text := 'revision = pbd_class_subject_entries.revision + 1';
BEGIN
  SELECT pg_get_functiondef(
    'pbd_save_subject_entries(text,text,text,text,jsonb,text,text)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(function_definition, old_expression, fixed_expression);

  IF position(fixed_expression IN function_definition) = 0 THEN
    RAISE EXCEPTION 'pbd_save_subject_entries revision increment could not be qualified';
  END IF;

  EXECUTE function_definition;
END;
$$;
