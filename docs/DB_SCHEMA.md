# DB Schema

## 기준

- 기준 문서: `docs/API.md`
- DB: PostgreSQL
- ID: UUID
- 시간: `TIMESTAMPTZ`, UTC 저장 기준
- 삭제 정책: 주요 조회 대상은 `deleted_at IS NULL`을 기본 조건으로 사용한다.
- SQL 파일: `backend/database/schema.sql`

## 설계 요약

API.md의 관리자 웹 API와 학생 앱 API가 모두 동작하도록 ERD 기본 테이블에 아래 항목을 보강했다.

- `users.login_id`: 관리자/학생 로그인용 고유 ID
- `refresh_tokens`: 액세스 토큰 재발급과 로그아웃용 refresh token 저장
- `security_questions`: 관리자 ID 찾기/비밀번호 재설정 보안 질문
- `password_reset_tokens`: 비밀번호 재설정용 단기 토큰
- `question_choices`: 학생 앱 제출 후에도 유지되는 객관식 선지 ID
- `workbooks.pass_score`: 문제집 합격 기준 점수
- `workbook_questions.sequence`, `points`, `is_required`: 문제집 문항 구성 API
- `workbook_assignments.opens_at`, `closes_at`, `max_attempts`: 문제집 배포/마감/재시도 제한
- `workbook_progresses`, `workbook_progress_answers`: 풀이 진행 상태 저장/조회
- `submissions.attempt_no`, `graded_at`, `earned_points`, `correct_rate`: 학생 제출과 성적 조회

## Enum

| Enum | 값 |
| --- | --- |
| `user_role` | `admin`, `teacher`, `student` |
| `user_status` | `active`, `inactive` |
| `cohort_status` | `planned`, `active`, `completed` |
| `student_status` | `active`, `inactive`, `paused`, `graduated` |
| `question_difficulty` | `easy`, `medium`, `hard` |
| `question_type` | `multiple_choice` |
| `content_status` | `draft`, `published`, `archived` |
| `assignment_status` | `scheduled`, `open`, `closed` |
| `learning_status` | `notStarted`, `inProgress`, `retrying`, `submitted` |
| `submission_status` | `in_progress`, `submitted`, `graded` |
| `recovery_purpose` | `find-id`, `reset-password` |

## 테이블

### users

공통 로그인 계정.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `login_id` | varchar(80) | NOT NULL, active row unique |
| `name` | varchar(100) | NOT NULL |
| `email` | varchar(255) | nullable, active row unique |
| `password_hash` | text | NOT NULL |
| `role` | user_role | NOT NULL |
| `status` | user_status | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `uq_users_login_id_active`
- `uq_users_email_active`
- `idx_users_role`
- `idx_users_status`

### refresh_tokens

토큰 재발급 및 로그아웃 처리.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, NOT NULL |
| `token_hash` | text | NOT NULL, active row unique |
| `expires_at` | timestamptz | NOT NULL |
| `revoked_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `uq_refresh_tokens_hash`
- `idx_refresh_tokens_user_id`
- `idx_refresh_tokens_expires_at`

### security_questions

관리자 ID 찾기/비밀번호 재설정 보안 질문.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, NOT NULL |
| `purpose` | recovery_purpose | NOT NULL |
| `question` | text | NOT NULL |
| `answer_hash` | text | NOT NULL |
| `is_active` | boolean | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `user_id + purpose`

### password_reset_tokens

비밀번호 재설정 검증 후 발급되는 단기 토큰.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, NOT NULL |
| `token_hash` | text | NOT NULL, active row unique |
| `expires_at` | timestamptz | NOT NULL |
| `used_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

### teachers

강사/관리자 프로필.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, active row unique, NOT NULL |
| `phone` | varchar(30) | nullable |
| `department` | varchar(100) | nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

### cohorts

기수.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `name` | varchar(120) | NOT NULL |
| `code` | varchar(50) | active row unique, NOT NULL |
| `description` | text | nullable |
| `starts_on` | date | NOT NULL |
| `ends_on` | date | nullable |
| `is_active` | boolean | NOT NULL |
| `status` | cohort_status | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `uq_cohorts_code_active`
- `idx_cohorts_status`
- `idx_cohorts_is_active`
- `idx_cohorts_starts_on`

### students

학생 프로필.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `user_id` | UUID | FK `users.id`, active row unique, NOT NULL |
| `cohort_id` | UUID | FK `cohorts.id`, NOT NULL |
| `phone` | varchar(30) | nullable |
| `birth_date` | date | nullable |
| `student_no` | varchar(50) | nullable, active row unique |
| `status` | student_status | NOT NULL |
| `enrolled_on` | date | NOT NULL |
| `completed_on` | date | nullable |
| `memo` | text | nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `idx_students_cohort_id`
- `idx_students_status`

### questions

문제은행.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `created_by` | UUID | FK `users.id`, NOT NULL |
| `subject` | varchar(120) | NOT NULL |
| `category` | varchar(120) | nullable |
| `difficulty` | question_difficulty | NOT NULL |
| `type` | question_type | NOT NULL |
| `content` | text | NOT NULL |
| `correct_answer_index` | integer | NOT NULL, `>= 0` |
| `explanation` | text | nullable |
| `status` | content_status | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `idx_questions_created_by`
- `idx_questions_subject`
- `idx_questions_category`
- `idx_questions_difficulty`
- `idx_questions_status`

### question_choices

객관식 선지. 학생 앱 진행 저장과 제출 답안에서 `selectedChoiceId`로 참조한다.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `question_id` | UUID | FK `questions.id`, NOT NULL |
| `choice_order` | integer | NOT NULL, `>= 0` |
| `text` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `question_id + choice_order`

### workbooks

문제집.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `created_by` | UUID | FK `users.id`, NOT NULL |
| `title` | varchar(200) | NOT NULL |
| `description` | text | nullable |
| `status` | content_status | NOT NULL |
| `pass_score` | integer | NOT NULL, 0~100 |
| `estimated_minutes` | integer | nullable, `> 0` |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

인덱스:

- `idx_workbooks_created_by`
- `idx_workbooks_status`
- `idx_workbooks_title`

### workbook_questions

문제집 문항 구성.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `workbook_id` | UUID | FK `workbooks.id`, NOT NULL |
| `question_id` | UUID | FK `questions.id`, NOT NULL |
| `sequence` | integer | NOT NULL, `> 0` |
| `points` | integer | NOT NULL, `>= 0` |
| `is_required` | boolean | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `workbook_id + question_id`
- active row 기준 `workbook_id + sequence`

### workbook_assignments

문제집 기수 배포.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `workbook_id` | UUID | FK `workbooks.id`, NOT NULL |
| `cohort_id` | UUID | FK `cohorts.id`, NOT NULL |
| `assigned_by_teacher_id` | UUID | FK `teachers.id`, NOT NULL |
| `status` | assignment_status | NOT NULL |
| `opens_at` | timestamptz | NOT NULL |
| `closes_at` | timestamptz | nullable |
| `max_attempts` | integer | NOT NULL, `> 0` |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `workbook_id + cohort_id`

### workbook_progresses

학생 앱 풀이 진행 상태. 학생과 배포 문제집 조합당 active row는 1개만 허용한다.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `workbook_assignment_id` | UUID | FK `workbook_assignments.id`, NOT NULL |
| `student_id` | UUID | FK `students.id`, NOT NULL |
| `learning_status` | learning_status | NOT NULL |
| `current_question_index` | integer | NOT NULL, `>= 0` |
| `answered_question_count` | integer | NOT NULL, `>= 0` |
| `is_active` | boolean | NOT NULL |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `workbook_assignment_id + student_id`

### workbook_progress_answers

풀이 진행 중 임시 저장 답안.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `workbook_progress_id` | UUID | FK `workbook_progresses.id`, NOT NULL |
| `workbook_question_id` | UUID | FK `workbook_questions.id`, NOT NULL |
| `selected_choice_id` | UUID | FK `question_choices.id`, nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `workbook_progress_id + workbook_question_id`

### submissions

학생 제출 및 성적.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `workbook_assignment_id` | UUID | FK `workbook_assignments.id`, NOT NULL |
| `workbook_id` | UUID | FK `workbooks.id`, NOT NULL |
| `student_id` | UUID | FK `students.id`, NOT NULL |
| `attempt_no` | integer | NOT NULL, `> 0` |
| `status` | submission_status | NOT NULL |
| `started_at` | timestamptz | NOT NULL |
| `submitted_at` | timestamptz | nullable |
| `graded_at` | timestamptz | nullable |
| `total_points` | integer | NOT NULL |
| `earned_points` | integer | NOT NULL |
| `score` | numeric(5,2) | NOT NULL, 0~100 |
| `correct_count` | integer | NOT NULL |
| `wrong_count` | integer | NOT NULL |
| `total_questions` | integer | NOT NULL |
| `correct_rate` | numeric(5,2) | NOT NULL, 0~100 |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `workbook_assignment_id + student_id + attempt_no`

### submission_answers

제출별 문항 답안과 채점 결과.

| 컬럼 | 타입 | 제약 |
| --- | --- | --- |
| `id` | UUID | PK |
| `submission_id` | UUID | FK `submissions.id`, NOT NULL |
| `workbook_question_id` | UUID | FK `workbook_questions.id`, NOT NULL |
| `question_id` | UUID | FK `questions.id`, NOT NULL |
| `selected_choice_id` | UUID | FK `question_choices.id`, nullable |
| `correct_choice_id` | UUID | FK `question_choices.id`, nullable |
| `is_correct` | boolean | NOT NULL |
| `earned_points` | integer | NOT NULL |
| `graded_at` | timestamptz | nullable |
| `created_at` | timestamptz | NOT NULL |
| `updated_at` | timestamptz | NOT NULL |
| `deleted_at` | timestamptz | nullable |

Unique:

- active row 기준 `submission_id + workbook_question_id`

## 주요 관계

| From | To |
| --- | --- |
| `teachers.user_id` | `users.id` |
| `students.user_id` | `users.id` |
| `students.cohort_id` | `cohorts.id` |
| `questions.created_by` | `users.id` |
| `question_choices.question_id` | `questions.id` |
| `workbooks.created_by` | `users.id` |
| `workbook_questions.workbook_id` | `workbooks.id` |
| `workbook_questions.question_id` | `questions.id` |
| `workbook_assignments.workbook_id` | `workbooks.id` |
| `workbook_assignments.cohort_id` | `cohorts.id` |
| `workbook_assignments.assigned_by_teacher_id` | `teachers.id` |
| `workbook_progresses.workbook_assignment_id` | `workbook_assignments.id` |
| `workbook_progresses.student_id` | `students.id` |
| `workbook_progress_answers.workbook_progress_id` | `workbook_progresses.id` |
| `workbook_progress_answers.workbook_question_id` | `workbook_questions.id` |
| `workbook_progress_answers.selected_choice_id` | `question_choices.id` |
| `submissions.workbook_assignment_id` | `workbook_assignments.id` |
| `submissions.workbook_id` | `workbooks.id` |
| `submissions.student_id` | `students.id` |
| `submission_answers.submission_id` | `submissions.id` |
| `submission_answers.workbook_question_id` | `workbook_questions.id` |
| `submission_answers.question_id` | `questions.id` |
| `submission_answers.selected_choice_id` | `question_choices.id` |
| `submission_answers.correct_choice_id` | `question_choices.id` |

## API 대응

| API 영역 | 주요 테이블 |
| --- | --- |
| 인증/토큰/계정 찾기 | `users`, `refresh_tokens`, `security_questions`, `password_reset_tokens` |
| 기수 CRUD | `cohorts`, `students` |
| 학생 CRUD | `users`, `students`, `cohorts` |
| 문제 CRUD | `questions`, `question_choices` |
| 문제집 CRUD | `workbooks`, `workbook_questions`, `questions`, `question_choices` |
| 문제집 배포 | `workbook_assignments`, `workbooks`, `cohorts`, `teachers` |
| 학생 앱 문제집 조회 | `students`, `cohorts`, `workbook_assignments`, `workbooks`, `workbook_questions`, `questions`, `question_choices`, `workbook_progresses`, `submissions` |
| 풀이 진행 저장/조회 | `workbook_progresses`, `workbook_progress_answers` |
| 문제 제출 | `submissions`, `submission_answers`, `question_choices`, `workbook_progresses` |
| 오답정리 | `submissions`, `submission_answers`, `workbook_questions`, `questions`, `question_choices` |
| 성적 조회/요약 | `submissions`, `submission_answers`, `students`, `cohorts`, `workbooks`, `workbook_assignments` |

## 인덱스 설계 원칙

- 목록 필터에 사용되는 `status`, `cohort_id`, `workbook_id`, `student_id`, `assignment_id` 계열 FK에 인덱스를 둔다.
- soft delete 테이블의 고유성은 `WHERE deleted_at IS NULL` partial unique index로 관리한다.
- 제출 목록과 성적 조회를 위해 `submissions.submitted_at`, `submissions.student_id`, `submissions.workbook_assignment_id`를 인덱싱한다.
- 오답정리와 문항별 분석을 위해 `submission_answers.question_id`, `submission_answers.is_correct`를 인덱싱한다.

## 참고

- `updated_at`은 `set_updated_at()` trigger로 자동 갱신한다.
- 학생 앱에서 요구하는 `choices[].id`는 `question_choices.id`로 제공한다.
- `correctAnswerIndex`는 API 호환을 위해 `questions.correct_answer_index`에 저장하고, 제출 상세의 정답 선지는 채점 시 `question_choices`에서 계산해 `submission_answers.correct_choice_id`로 저장한다.
