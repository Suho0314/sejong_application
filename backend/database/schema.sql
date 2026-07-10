CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE cohort_status AS ENUM ('planned', 'active', 'completed');
CREATE TYPE student_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM ('multiple_choice');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE assignment_status AS ENUM ('scheduled', 'open', 'closed');
CREATE TYPE learning_status AS ENUM ('notStarted', 'inProgress', 'retrying', 'submitted');
CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'graded');
CREATE TYPE recovery_purpose AS ENUM ('find-id', 'reset-password');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_id VARCHAR(80) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  auth_provider VARCHAR(30) NOT NULL DEFAULT 'password',
  provider_user_id VARCHAR(120),
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_users_login_id_active ON users (login_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_auth_provider_user_active
  ON users (auth_provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_auth_provider ON users (auth_provider);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_refresh_tokens_hash ON refresh_tokens (token_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

CREATE TABLE security_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  purpose recovery_purpose NOT NULL,
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_security_questions_user_purpose_active
  ON security_questions (user_id, purpose)
  WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_security_questions_user_id ON security_questions (user_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_password_reset_tokens_hash ON password_reset_tokens (token_hash) WHERE deleted_at IS NULL;
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);

CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  phone VARCHAR(30),
  department VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_teachers_user_id_active ON teachers (user_id) WHERE deleted_at IS NULL;

CREATE TABLE cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  starts_on DATE NOT NULL,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  status cohort_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_cohorts_code_active ON cohorts (code) WHERE deleted_at IS NULL;
CREATE INDEX idx_cohorts_status ON cohorts (status);
CREATE INDEX idx_cohorts_is_active ON cohorts (is_active);
CREATE INDEX idx_cohorts_starts_on ON cohorts (starts_on);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  cohort_id UUID REFERENCES cohorts(id),
  phone VARCHAR(30),
  birth_date DATE,
  student_no VARCHAR(50),
  status student_status NOT NULL DEFAULT 'pending',
  enrolled_on DATE,
  completed_on DATE,
  approved_at TIMESTAMPTZ,
  approved_by_teacher_id UUID REFERENCES teachers(id),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_students_user_id_active ON students (user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_students_student_no_active ON students (student_no) WHERE student_no IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_students_cohort_id ON students (cohort_id);
CREATE INDEX idx_students_status ON students (status);
CREATE INDEX idx_students_approved_by_teacher_id ON students (approved_by_teacher_id);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(120) NOT NULL,
  category VARCHAR(120),
  difficulty question_difficulty NOT NULL,
  type question_type NOT NULL DEFAULT 'multiple_choice',
  content TEXT NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_questions_correct_answer_index CHECK (correct_answer_index >= 0)
);

CREATE INDEX idx_questions_created_by ON questions (created_by);
CREATE INDEX idx_questions_subject ON questions (subject);
CREATE INDEX idx_questions_category ON questions (category);
CREATE INDEX idx_questions_difficulty ON questions (difficulty);
CREATE INDEX idx_questions_status ON questions (status);

CREATE TABLE question_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_order INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_question_choices_order CHECK (choice_order >= 0)
);

CREATE UNIQUE INDEX uq_question_choices_question_order_active
  ON question_choices (question_id, choice_order)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_question_choices_question_id ON question_choices (question_id);

CREATE TABLE workbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  pass_score INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_workbooks_pass_score CHECK (pass_score BETWEEN 0 AND 100),
  CONSTRAINT chk_workbooks_estimated_minutes CHECK (estimated_minutes IS NULL OR estimated_minutes > 0)
);

CREATE INDEX idx_workbooks_created_by ON workbooks (created_by);
CREATE INDEX idx_workbooks_status ON workbooks (status);
CREATE INDEX idx_workbooks_title ON workbooks (title);

CREATE TABLE workbook_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID NOT NULL REFERENCES workbooks(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  sequence INTEGER NOT NULL,
  points NUMERIC(7,2) NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_workbook_questions_sequence CHECK (sequence > 0),
  CONSTRAINT chk_workbook_questions_points CHECK (points >= 0)
);

CREATE UNIQUE INDEX uq_workbook_questions_workbook_question_active
  ON workbook_questions (workbook_id, question_id)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_workbook_questions_workbook_sequence_active
  ON workbook_questions (workbook_id, sequence)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_workbook_questions_workbook_id ON workbook_questions (workbook_id);
CREATE INDEX idx_workbook_questions_question_id ON workbook_questions (question_id);

CREATE TABLE workbook_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_id UUID NOT NULL REFERENCES workbooks(id),
  cohort_id UUID NOT NULL REFERENCES cohorts(id),
  assigned_by_teacher_id UUID NOT NULL REFERENCES teachers(id),
  status assignment_status NOT NULL DEFAULT 'scheduled',
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_workbook_assignments_attempts CHECK (max_attempts > 0),
  CONSTRAINT chk_workbook_assignments_date_range CHECK (closes_at IS NULL OR closes_at > opens_at)
);

CREATE UNIQUE INDEX uq_workbook_assignments_workbook_cohort_active
  ON workbook_assignments (workbook_id, cohort_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_workbook_assignments_workbook_id ON workbook_assignments (workbook_id);
CREATE INDEX idx_workbook_assignments_cohort_id ON workbook_assignments (cohort_id);
CREATE INDEX idx_workbook_assignments_status ON workbook_assignments (status);
CREATE INDEX idx_workbook_assignments_opens_closes ON workbook_assignments (opens_at, closes_at);

CREATE TABLE workbook_progresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_assignment_id UUID NOT NULL REFERENCES workbook_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  learning_status learning_status NOT NULL DEFAULT 'inProgress',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  answered_question_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_workbook_progresses_current_index CHECK (current_question_index >= 0),
  CONSTRAINT chk_workbook_progresses_answered_count CHECK (answered_question_count >= 0)
);

CREATE UNIQUE INDEX uq_workbook_progresses_active
  ON workbook_progresses (workbook_assignment_id, student_id)
  WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_workbook_progresses_student_id ON workbook_progresses (student_id);
CREATE INDEX idx_workbook_progresses_assignment_id ON workbook_progresses (workbook_assignment_id);

CREATE TABLE workbook_progress_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_progress_id UUID NOT NULL REFERENCES workbook_progresses(id) ON DELETE CASCADE,
  workbook_question_id UUID NOT NULL REFERENCES workbook_questions(id),
  selected_choice_id UUID REFERENCES question_choices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_workbook_progress_answers_question_active
  ON workbook_progress_answers (workbook_progress_id, workbook_question_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_workbook_progress_answers_progress_id ON workbook_progress_answers (workbook_progress_id);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_assignment_id UUID NOT NULL REFERENCES workbook_assignments(id),
  workbook_id UUID NOT NULL REFERENCES workbooks(id),
  student_id UUID NOT NULL REFERENCES students(id),
  attempt_no INTEGER NOT NULL,
  status submission_status NOT NULL DEFAULT 'graded',
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  total_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  earned_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_submissions_attempt_no CHECK (attempt_no > 0),
  CONSTRAINT chk_submissions_counts CHECK (correct_count >= 0 AND wrong_count >= 0 AND total_questions >= 0),
  CONSTRAINT chk_submissions_points CHECK (total_points >= 0 AND earned_points >= 0),
  CONSTRAINT chk_submissions_score CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT chk_submissions_correct_rate CHECK (correct_rate BETWEEN 0 AND 100)
);

CREATE UNIQUE INDEX uq_submissions_assignment_student_attempt_active
  ON submissions (workbook_assignment_id, student_id, attempt_no)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_submissions_assignment_id ON submissions (workbook_assignment_id);
CREATE INDEX idx_submissions_workbook_id ON submissions (workbook_id);
CREATE INDEX idx_submissions_student_id ON submissions (student_id);
CREATE INDEX idx_submissions_status ON submissions (status);
CREATE INDEX idx_submissions_submitted_at ON submissions (submitted_at);

CREATE TABLE submission_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  workbook_question_id UUID NOT NULL REFERENCES workbook_questions(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  selected_choice_id UUID REFERENCES question_choices(id),
  correct_choice_id UUID REFERENCES question_choices(id),
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  earned_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_submission_answers_points CHECK (earned_points >= 0)
);

CREATE UNIQUE INDEX uq_submission_answers_submission_workbook_question_active
  ON submission_answers (submission_id, workbook_question_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_submission_answers_submission_id ON submission_answers (submission_id);
CREATE INDEX idx_submission_answers_question_id ON submission_answers (question_id);
CREATE INDEX idx_submission_answers_workbook_question_id ON submission_answers (workbook_question_id);
CREATE INDEX idx_submission_answers_is_correct ON submission_answers (is_correct);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_security_questions_updated_at BEFORE UPDATE ON security_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_password_reset_tokens_updated_at BEFORE UPDATE ON password_reset_tokens FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cohorts_updated_at BEFORE UPDATE ON cohorts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_question_choices_updated_at BEFORE UPDATE ON question_choices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workbooks_updated_at BEFORE UPDATE ON workbooks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workbook_questions_updated_at BEFORE UPDATE ON workbook_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workbook_assignments_updated_at BEFORE UPDATE ON workbook_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workbook_progresses_updated_at BEFORE UPDATE ON workbook_progresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workbook_progress_answers_updated_at BEFORE UPDATE ON workbook_progress_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_submission_answers_updated_at BEFORE UPDATE ON submission_answers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
