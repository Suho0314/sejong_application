-- Kakao student approval migration.
-- Run manually after taking a production database backup.
-- This migration is intentionally non-destructive: it does not delete users,
-- students, submissions, scores, questions, workbooks, cohorts, or teachers.

ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE student_status ADD VALUE IF NOT EXISTS 'suspended';

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'password',
  ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_provider_user_active
  ON users (auth_provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users (auth_provider);

ALTER TABLE students
  ALTER COLUMN cohort_id DROP NOT NULL,
  ALTER COLUMN enrolled_on DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_teacher_id UUID REFERENCES teachers(id);

CREATE INDEX IF NOT EXISTS idx_students_approved_by_teacher_id
  ON students (approved_by_teacher_id);

-- Existing student accounts are treated as legacy test data. Do not delete them
-- here. Map them to the closest new approval statuses so old JWTs are not enough
-- unless the student is actually approved.
UPDATE students
SET status = CASE
    WHEN status::text IN ('active', 'graduated') THEN 'approved'::student_status
    WHEN status::text IN ('inactive', 'paused') THEN 'suspended'::student_status
    ELSE status
  END,
  approved_at = COALESCE(approved_at, now())
WHERE status::text IN ('active', 'inactive', 'paused', 'graduated');

COMMIT;
