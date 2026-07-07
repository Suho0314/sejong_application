# ERD

## 1. 프로젝트 데이터 구조 개요

간호학원 문제집 관리 시스템은 강사가 문제은행의 문제를 조합해 문제집을 만들고, 문제집을 특정 기수에 배포하며, 학생이 본인 기수에 배포된 문제집만 풀이하는 구조다.

핵심 데이터 흐름:

1. `users`는 관리자, 강사, 학생의 공통 로그인 계정이다.
2. `teachers`와 `students`는 `users`를 1:1로 확장하는 프로필 테이블이다.
3. `students`는 하나의 `cohorts`에 소속된다.
4. `questions`는 문제은행에 독립적으로 저장된다.
5. `workbooks`는 `workbook_questions`를 통해 여러 `questions`를 포함한다.
6. `workbooks`는 `workbook_assignments`를 통해 하나 이상의 `cohorts`에 배포된다.
7. 학생이 문제집을 풀면 `submissions`가 생성되고, 문항별 답안은 `submission_answers`에 저장된다.

## 2. 핵심 비즈니스 규칙

- User는 강사, 관리자, 학생 계정의 공통 로그인 정보를 가진다.
- User의 `role`은 `admin`, `teacher`, `student` 중 하나다.
- Student는 User와 1:1 관계를 가진다.
- Teacher도 User와 1:1 관계를 가진다.
- Student는 하나의 Cohort에 소속된다.
- Cohort는 여러 Student를 가진다.
- Question은 문제은행에 저장된다.
- Workbook은 여러 Question을 포함한다.
- Workbook과 Question은 N:M 관계이며 `workbook_questions`로 연결한다.
- `workbook_questions.orderIndex`에는 문제집 안에서의 문제 순서를 저장한다.
- Workbook은 하나 이상의 Cohort에 배포될 수 있다.
- Workbook과 Cohort는 N:M 관계이며 `workbook_assignments`로 연결한다.
- 학생은 본인이 속한 Cohort에 배포된 Workbook만 풀 수 있다.
- Student가 Workbook을 제출하면 Submission이 생성된다.
- Submission은 Student와 Workbook을 참조한다.
- SubmissionAnswer는 Submission과 Question을 참조한다.
- 점수 합계는 Submission에 저장한다.
- 각 문항의 선택 답안과 정답 여부는 SubmissionAnswer에 저장한다.

## 3. 테이블별 상세 정의

### users

공통 로그인 계정 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 사용자 ID |
| name | string | NOT NULL | 이름 |
| email | string | UNIQUE, NOT NULL | 로그인 이메일 |
| passwordHash | string | NOT NULL | 비밀번호 해시 |
| role | `admin` \| `teacher` \| `student` | NOT NULL | 사용자 역할 |
| status | `active` \| `inactive` | NOT NULL | 계정 상태 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### teachers

강사 프로필 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 강사 ID |
| userId | string | FK users.id, UNIQUE, NOT NULL | 연결된 User ID |
| phone | string | NULL | 연락처 |
| department | string | NULL | 소속 부서 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### cohorts

기수 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 기수 ID |
| name | string | NOT NULL | 기수명 |
| description | string | NULL | 설명 |
| startDate | ISO string | NOT NULL | 시작일 |
| endDate | ISO string \| null | NULL | 종료일 |
| status | `planned` \| `active` \| `completed` | NOT NULL | 기수 상태 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### students

학생 프로필 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 학생 ID |
| userId | string | FK users.id, UNIQUE, NOT NULL | 연결된 User ID |
| cohortId | string | FK cohorts.id, NOT NULL | 소속 기수 ID |
| phone | string | NULL | 연락처 |
| birthDate | ISO string | NULL | 생년월일 |
| status | `active` \| `inactive` \| `graduated` | NOT NULL | 학생 상태 |
| enrolledAt | ISO string | NOT NULL | 등록일 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### questions

문제은행 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 문제 ID |
| createdBy | string | FK users.id, NOT NULL | 작성자 User ID |
| subject | string | NOT NULL | 과목 |
| category | string | NULL | 단원 또는 분류 |
| difficulty | `easy` \| `medium` \| `hard` | NOT NULL | 난이도 |
| type | `multiple_choice` | NOT NULL | 문제 유형 |
| content | string | NOT NULL | 문제 본문 |
| choices | string[] | NOT NULL | 객관식 보기 |
| correctAnswerIndex | number | NOT NULL | 정답 보기 index |
| explanation | string | NULL | 해설 |
| status | `draft` \| `published` \| `archived` | NOT NULL | 콘텐츠 상태 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### workbooks

문제집 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 문제집 ID |
| createdBy | string | FK users.id, NOT NULL | 작성자 User ID |
| title | string | NOT NULL | 문제집 제목 |
| description | string | NULL | 설명 |
| status | `draft` \| `published` \| `archived` | NOT NULL | 콘텐츠 상태 |
| timeLimitMinutes | number \| null | NULL | 제한 시간 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |
| deletedAt | ISO string \| null | NULL | soft delete 일시 |

Soft Delete: 적용.

### workbook_questions

Workbook과 Question의 N:M 연결 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 연결 ID |
| workbookId | string | FK workbooks.id, NOT NULL | 문제집 ID |
| questionId | string | FK questions.id, NOT NULL | 문제 ID |
| orderIndex | number | NOT NULL | 문제 순서 |
| score | number | NOT NULL | 문항 배점 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |

제약:

- `UNIQUE(workbookId, questionId)`
- `UNIQUE(workbookId, orderIndex)`

Soft Delete: 미적용. 문제집 구성에서 제거가 필요하면 물리 삭제 또는 별도 이력 테이블을 검토한다.

### workbook_assignments

Workbook과 Cohort의 N:M 배포 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 배포 ID |
| workbookId | string | FK workbooks.id, NOT NULL | 문제집 ID |
| cohortId | string | FK cohorts.id, NOT NULL | 배포 대상 기수 ID |
| assignedBy | string | FK users.id, NOT NULL | 배포자 User ID |
| assignedAt | ISO string | NOT NULL | 배포일 |
| dueDate | ISO string \| null | NULL | 제출 마감일 |
| status | `active` \| `closed` | NOT NULL | 배포 상태 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |

제약:

- `UNIQUE(workbookId, cohortId)`

Soft Delete: 미적용. 배포 종료는 `status = closed`로 처리한다.

### submissions

학생의 문제집 제출 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 제출 ID |
| studentId | string | FK students.id, NOT NULL | 제출 학생 ID |
| workbookId | string | FK workbooks.id, NOT NULL | 제출 문제집 ID |
| startedAt | ISO string | NOT NULL | 풀이 시작일 |
| submittedAt | ISO string \| null | NULL | 제출일 |
| score | number | NOT NULL | 획득 점수 |
| totalScore | number | NOT NULL | 총점 |
| correctCount | number | NOT NULL | 정답 수 |
| wrongCount | number | NOT NULL | 오답 수 |
| status | `in_progress` \| `submitted` | NOT NULL | 제출 상태 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |

Soft Delete: 미적용. 성적 이력을 위해 제출 기록은 유지한다.

### submission_answers

제출별 문항 답안 테이블.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | string | PK, UUID | 답안 ID |
| submissionId | string | FK submissions.id, NOT NULL | 제출 ID |
| questionId | string | FK questions.id, NOT NULL | 문제 ID |
| selectedAnswerIndex | number \| null | NULL | 학생이 선택한 보기 index |
| isCorrect | boolean | NOT NULL | 정답 여부 |
| score | number | NOT NULL | 획득 배점 |
| createdAt | ISO string | NOT NULL | 생성일 |
| updatedAt | ISO string | NOT NULL | 수정일 |

제약:

- `UNIQUE(submissionId, questionId)`

Soft Delete: 미적용. 제출 답안은 성적 이력으로 유지한다.

## 4. PK/FK 관계

| From | To | 관계 |
| --- | --- | --- |
| teachers.userId | users.id | Teacher 계정 |
| students.userId | users.id | Student 계정 |
| students.cohortId | cohorts.id | 학생 소속 기수 |
| questions.createdBy | users.id | 문제 작성자 |
| workbooks.createdBy | users.id | 문제집 작성자 |
| workbook_questions.workbookId | workbooks.id | 문제집 구성 |
| workbook_questions.questionId | questions.id | 문제집 포함 문제 |
| workbook_assignments.workbookId | workbooks.id | 배포 문제집 |
| workbook_assignments.cohortId | cohorts.id | 배포 대상 기수 |
| workbook_assignments.assignedBy | users.id | 배포자 |
| submissions.studentId | students.id | 제출 학생 |
| submissions.workbookId | workbooks.id | 제출 문제집 |
| submission_answers.submissionId | submissions.id | 제출 답안 |
| submission_answers.questionId | questions.id | 답안 대상 문제 |

## 5. 1:N, N:M 관계

- `users` 1:1 `teachers`
- `users` 1:1 `students`
- `cohorts` 1:N `students`
- `users` 1:N `questions`
- `users` 1:N `workbooks`
- `workbooks` N:M `questions` through `workbook_questions`
- `workbooks` N:M `cohorts` through `workbook_assignments`
- `students` 1:N `submissions`
- `workbooks` 1:N `submissions`
- `submissions` 1:N `submission_answers`
- `questions` 1:N `submission_answers`

## 6. Soft Delete 적용 여부

| 테이블 | Soft Delete | 이유 |
| --- | --- | --- |
| users | 적용 | 계정 복구와 감사 추적 |
| teachers | 적용 | 강사 프로필 이력 보존 |
| cohorts | 적용 | 과거 기수 기록 보존 |
| students | 적용 | 학생 성적 이력 보존 |
| questions | 적용 | 기존 제출 답안과의 참조 보존 |
| workbooks | 적용 | 기존 제출 성적과의 참조 보존 |
| workbook_questions | 미적용 | 구성 변경은 현재 상태 중심 |
| workbook_assignments | 미적용 | 종료는 status로 관리 |
| submissions | 미적용 | 성적 이력 보존 |
| submission_answers | 미적용 | 성적 상세 이력 보존 |

## 7. 추후 API 설계 시 주의사항

- 학생 앱에서 문제집 목록을 조회할 때는 `students.cohortId`와 `workbook_assignments.cohortId`를 반드시 검증한다.
- 학생이 제출할 때 해당 Workbook이 학생의 Cohort에 배포되어 있는지 확인한다.
- SubmissionAnswer는 제출한 Workbook에 포함된 Question만 허용한다.
- 점수 계산은 서버에서 수행하고, 클라이언트가 보낸 점수는 신뢰하지 않는다.
- `workbook_questions.orderIndex` 순서대로 문제를 반환한다.
- soft delete 된 `users`, `students`, `questions`, `workbooks`는 기본 조회에서 제외한다.
- 관리자와 강사는 같은 User 기반 인증을 사용하되 권한 검증은 `role`로 분리한다.
