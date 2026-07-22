-- Class teacher name: displayed on UPSA/UASA slips and class exports
-- under the "GURU KELAS" signature block.

ALTER TABLE school_classes ADD COLUMN IF NOT EXISTS teacher_name text;
