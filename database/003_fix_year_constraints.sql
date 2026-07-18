ALTER TABLE academic_years
  DROP CONSTRAINT IF EXISTS academic_years_year_check;

ALTER TABLE academic_years
  ADD CONSTRAINT academic_years_year_check CHECK (year ~ '^[0-9]{4}$');

ALTER TABLE workbook_sources
  DROP CONSTRAINT IF EXISTS workbook_sources_year_check;

ALTER TABLE workbook_sources
  ADD CONSTRAINT workbook_sources_year_check CHECK (year ~ '^[0-9]{4}$');
