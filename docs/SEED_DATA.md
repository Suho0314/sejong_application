# Seed Data

## 목적

`backend/database/seed.sql`은 `backend/database/schema.sql` 적용 후 API 개발과 수동 테스트에 필요한 최소 데이터를 구성한다.

이 seed는 기존 `admin-web/src/mock` 데이터를 기준으로 작성하되, DB 스키마의 PK 타입이 UUID이므로 모든 주요 레코드에 고정 UUID를 부여했다. 프론트 mock 파일은 수정하지 않는다.

## 적용 순서

```bash
psql "$DATABASE_URL" -f backend/database/schema.sql
psql "$DATABASE_URL" -f backend/database/seed.sql
```

`seed.sql`은 `ON CONFLICT (id) DO NOTHING`을 사용한다. 같은 seed PK가 이미 있는 경우 중복 삽입하지 않는다.

## 포함 데이터 요약

| 구분 | 수량 | 설명 |
| --- | ---: | --- |
| 관리자 계정 | 1 | `admin` |
| 강사 계정 | 2 | `teacher1`, `teacher2` |
| 학생 계정 | 8 | `student1` ~ `student8` |
| 보안 질문 | 2 | 관리자 ID 찾기, 비밀번호 찾기 |
| 기수 | 3 | 2026년 1기, 2026년 2기, 2025년 4기 |
| 학생 프로필 | 8 | 각 학생 계정과 기수 연결 |
| 문제 | 12 | 객관식 `multiple_choice` |
| 문제 보기 | 48 | 문제별 4개 보기 |
| 문제집 | 4 | 기본간호, 감염관리, 술기, 최종 모의고사 |
| 문제집-문제 연결 | 19 | 문제집별 순서와 배점 포함 |
| 문제집 기수 배포 | 5 | open, scheduled, closed 상태 포함 |
| 학습 진행 | 4 | 제출 완료/진행 중 예시 |
| 제출 | 9 | 채점 완료 8건, 진행 중 1건 |
| 제출 답안 | 37 | 정답/오답과 선택 보기 FK 포함 |

## 테스트 계정

비밀번호 해시는 개발용 placeholder다. 실제 로그인 API 구현 시에는 애플리케이션에서 사용하는 해시 알고리즘으로 교체해야 한다.

| 역할 | Login ID | Password Hash Placeholder |
| --- | --- | --- |
| 관리자 | `admin` | `$seed$admin-1234` |
| 강사 | `teacher1` | `$seed$teacher-1234` |
| 강사 | `teacher2` | `$seed$teacher-1234` |
| 학생 | `student1` ~ `student8` | `$seed$student-1234` |

관리자 계정 찾기용 보안 질문:

| 목적 | 질문 | 답변 Placeholder |
| --- | --- | --- |
| ID 찾기 | 학원 이름은 무엇인가요? | `$seed$세종간호학원` |
| 비밀번호 찾기 | 학원 이름은 무엇인가요? | `$seed$세종간호학원` |

## 주요 UUID 규칙

테스트 시 사람이 추적하기 쉽도록 UUID의 네 번째 그룹으로 도메인을 구분했다.

| UUID 그룹 | 테이블 |
| --- | --- |
| `0001` | `users` |
| `0002` | `teachers` |
| `0003` | `cohorts` |
| `0004` | `students` |
| `0005` | `questions` |
| `0006` | `question_choices` |
| `0007` | `workbooks` |
| `0008` | `workbook_questions` |
| `0009` | `workbook_assignments` |
| `000a` | `submissions` |
| `000b` | `submission_answers` |
| `000c` | `security_questions` |
| `000d` | `workbook_progresses` |

## API 테스트 대응

| API 영역 | 사용 테이블 |
| --- | --- |
| 로그인 | `users`, `refresh_tokens` |
| ID/비밀번호 찾기 | `users`, `security_questions`, `password_reset_tokens` |
| 기수 CRUD | `cohorts` |
| 학생 CRUD | `users`, `students`, `cohorts` |
| 문제 CRUD | `questions`, `question_choices` |
| 문제집 CRUD | `workbooks`, `workbook_questions`, `questions` |
| 문제집 배포 | `workbook_assignments`, `workbooks`, `cohorts`, `teachers` |
| 문제 제출 | `workbook_assignments`, `submissions`, `submission_answers`, `question_choices` |
| 성적 조회 | `submissions`, `submission_answers`, `students`, `cohorts`, `workbooks`, `questions` |

## 데이터 관계

- 모든 학생은 `users.role = 'student'` 계정과 `students` 프로필을 가진다.
- 모든 문제는 강사 계정의 `users.id`를 `created_by`로 참조한다.
- 모든 문제는 `question_choices` 4개를 가진다.
- 문제집은 `workbook_questions.sequence`로 문제 순서를 관리한다.
- 문제집 배포는 `workbook_assignments`에서 기수 단위로 관리한다.
- 제출은 `submissions`에 요약 점수를 저장하고, 문항별 답안은 `submission_answers`에 저장한다.
- `submission_answers.selected_choice_id`와 `correct_choice_id`는 모두 `question_choices.id`를 참조한다.

## 주의사항

- seed 데이터는 API 테스트용 최소 데이터이며 운영 데이터가 아니다.
- `password_hash`, `answer_hash` 값은 실제 해시가 아니다.
- `workbook_assignments.status`는 DB enum 기준에 맞춰 mock의 `active`를 `open` 또는 `scheduled`로 변환했다.
- `submissions.status`는 채점 완료 데이터를 `graded`, 풀이 중 데이터를 `in_progress`로 저장했다.
- soft delete 테스트가 필요하면 각 테이블의 `deleted_at`에 값을 넣는 별도 fixture를 추가한다.
