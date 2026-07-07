-- Normalize all whitespace characters in question subject/category values.
-- This migration is intentionally one-way: original whitespace positions
-- cannot be reconstructed after normalization.
--
-- Development pre-check examples:
-- SELECT COUNT(*) FROM questions
-- WHERE subject IS DISTINCT FROM regexp_replace(subject, '[[:space:]]+', '', 'g')
--    OR category IS DISTINCT FROM NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '');
--
-- SELECT COUNT(*) FROM questions
-- WHERE NULLIF(regexp_replace(subject, '[[:space:]]+', '', 'g'), '') IS NULL;

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM questions
    WHERE NULLIF(regexp_replace(subject, '[[:space:]]+', '', 'g'), '') IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot normalize question subjects: questions.subject is NOT NULL, but at least one subject becomes empty after whitespace removal.';
  END IF;
END $$;

UPDATE questions
SET
  subject = regexp_replace(subject, '[[:space:]]+', '', 'g'),
  category = NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), ''),
  updated_at = now()
WHERE
  subject IS DISTINCT FROM regexp_replace(subject, '[[:space:]]+', '', 'g')
  OR category IS DISTINCT FROM NULLIF(regexp_replace(category, '[[:space:]]+', '', 'g'), '');

COMMIT;

-- Down migration:
-- No-op by design. Removed whitespace cannot be restored safely without an
-- external backup or audit log.
