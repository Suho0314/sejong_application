-- Allow workbook question and submission point values to keep two decimal places.
-- Existing integer values are preserved as equivalent numeric values.

BEGIN;

ALTER TABLE workbook_questions
  ALTER COLUMN points TYPE NUMERIC(7,2)
  USING points::numeric(7,2);

ALTER TABLE submissions
  ALTER COLUMN total_points TYPE NUMERIC(7,2)
  USING total_points::numeric(7,2),
  ALTER COLUMN earned_points TYPE NUMERIC(7,2)
  USING earned_points::numeric(7,2);

ALTER TABLE submission_answers
  ALTER COLUMN earned_points TYPE NUMERIC(7,2)
  USING earned_points::numeric(7,2);

COMMIT;
