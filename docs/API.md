# Kakao 학생 가입 승인제 추가 명세

## 학생 상태

학생 상태값은 `pending`, `approved`, `rejected`, `suspended`를 사용한다.

- `pending`: 카카오 최초 로그인 후 강사 승인 대기
- `approved`: 강사가 기수를 배정하고 승인 완료
- `rejected`: 가입 승인 거절
- `suspended`: 이용 중지

## 승인 전후 JWT 정책

- `pending`, `rejected`, `suspended` 학생에게는 일반 Student JWT를 발급하지 않는다.
- `approved` 상태이고 `cohortId`가 배정된 학생에게만 Student JWT를 발급한다.
- Student API는 JWT role 검증 후에도 DB의 학생 상태가 `approved`인지 재검증한다.

## Admin 학생 승인 API

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/students/{studentId}/approve` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `422` |

Request:

```json
{
  "cohortId": "cohort-uuid"
}
```

## Admin 학생 승인 거절 API

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/students/{studentId}/reject` |
| StatusCode | `200`, `401`, `403`, `404` |

## Admin 학생 이용 중지 API

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/students/{studentId}/suspend` |
| StatusCode | `200`, `401`, `403`, `404` |

# API

## 개요

이 문서는 간호학원 문제집 관리 시스템의 REST API 설계 문서이다. `docs/ERD.md`의 PostgreSQL 데이터 모델을 기준으로 작성한다. 강사용 웹 API를 우선 설계하고, 학생 앱에서 필요한 문제집 조회와 제출 API를 함께 정의한다.

## 공통 규칙

- Base URL: `/api`
- 요청과 응답은 JSON을 사용한다.
- 인증이 필요한 API는 `Authorization: Bearer {accessToken}` 헤더를 사용한다.
- ID는 UUID 문자열을 사용한다.
- 날짜와 시간은 ISO 8601 문자열을 사용한다.
- 삭제 API는 물리 삭제가 아니라 `deleted_at`을 갱신하는 soft delete로 처리한다.
- 목록 API는 기본적으로 `page`, `limit` 페이지네이션을 지원한다.
- 기본 조회는 `deleted_at IS NULL`인 데이터만 반환한다.

## 공통 응답 형식

### 성공

```json
{
  "data": {},
  "meta": {}
}
```

### 실패

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 값이 올바르지 않습니다.",
    "details": []
  }
}
```

## 공통 StatusCode

| StatusCode | 설명 |
| --- | --- |
| 200 | 조회, 수정, 제출 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 또는 상태 충돌 |
| 422 | 유효성 검증 실패 |
| 500 | 서버 오류 |

## 인증

### 강사용 웹 로그인

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/teacher/login` |
| StatusCode | `200`, `400`, `401`, `403` |

Request:

```json
{
  "loginId": "teacher1",
  "password": "password"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt-access-token",
    "user": {
      "id": "user-uuid",
      "role": "teacher",
      "name": "강사명",
      "loginId": "teacher1",
      "email": "teacher@example.com",
      "teacherId": "teacher-uuid"
    }
  }
}
```

### 학생 카카오 인가 URL 발급

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/auth/student/kakao/authorize` |
| StatusCode | `200`, `400`, `500` |

Query parameters: `redirectUri`, `state`

정책:

- `redirectUri`는 Backend 환경변수 `KAKAO_ALLOWED_REDIRECT_URIS`의 쉼표 구분 목록과 정확히 일치해야 한다.
- 와일드카드, prefix 비교, 임의 하위 도메인 허용은 사용하지 않는다.
- `state`는 클라이언트가 로그인 시도별로 생성한 예측 불가능한 문자열이며, 카카오 인가 URL에 그대로 포함된다.

Response:

```json
{
  "data": {
    "authorizationUrl": "https://kauth.kakao.com/oauth/authorize?...&state=oauth-state"
  }
}
```

### 학생 카카오 로그인 완료

카카오 authorization code를 Backend가 token으로 교환하고 카카오 사용자 정보를 조회한다. 학생 식별 기준은 카카오 고유 사용자 ID이며 닉네임·이메일은 식별 기준으로 사용하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/student/kakao/callback` |
| StatusCode | `200`, `400`, `401`, `403`, `500` |

Request:

```json
{
  "code": "kakao-authorization-code",
  "redirectUri": "https://student-app.example.com",
  "state": "oauth-state"
}
```

정책:

- callback 요청의 `redirectUri`도 `KAKAO_ALLOWED_REDIRECT_URIS`와 정확히 일치해야 한다.
- Student App은 저장해둔 state와 callback state가 일치할 때만 이 API를 호출한다.
- state 누락 또는 불일치 시 Student App은 Backend callback API를 호출하지 않는다.

Pending / rejected / suspended Response:

```json
{
  "data": {
    "status": "pending",
    "student": {
      "id": "student-uuid",
      "name": "카카오 학생",
      "email": "student@example.com",
      "cohortId": null,
      "status": "pending"
    }
  }
}
```

Approved Response:

```json
{
  "data": {
    "status": "approved",
    "accessToken": "jwt-access-token",
    "user": {
      "id": "user-uuid",
      "role": "student",
      "name": "학생명",
      "loginId": "kakao:123456789",
      "studentId": "student-uuid",
      "cohortId": "cohort-uuid"
    }
  }
}
```

정책:

- 신규 카카오 학생은 `pending` 상태로 생성한다.
- `pending`, `rejected`, `suspended` 학생에게는 일반 Student JWT를 발급하지 않는다.
- `approved`이고 기수가 배정된 학생만 Student JWT를 발급받는다.
- 학생 API는 JWT 검증 후에도 DB의 학생 상태가 `approved`인지 다시 확인한다.

Response:

```json
{
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "user-uuid",
      "role": "student",
      "name": "학생명",
      "loginId": "student01",
      "studentId": "student-uuid",
      "cohortId": "cohort-uuid"
    }
  }
}
```

### 계정 찾기 보안 질문 조회

강사용 웹의 ID 찾기와 비밀번호 재설정에서 사용한다. 현재 구현처럼 휴대폰·이메일 인증 대신 사전에 등록한 보안 질문을 사용한다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/auth/admin/recovery-question` |
| StatusCode | `200`, `400`, `404` |

Query parameters: `purpose=find-id | reset-password`

Example: `GET /api/auth/admin/recovery-question?purpose=find-id`

Response:

```json
{
  "data": {
    "questionId": "security-question-uuid",
    "question": "관리자 보안 질문"
  }
}
```

### 관리자 ID 찾기

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/admin/find-login-id` |
| StatusCode | `200`, `400`, `401`, `404`, `422` |

Request:

```json
{
  "questionId": "security-question-uuid",
  "securityAnswer": "보안 질문 답변"
}
```

Response:

```json
{
  "data": {
    "loginId": "admin"
  }
}
```

### 관리자 비밀번호 재설정 인증

비밀번호 원문을 반환하지 않는다. 보안 질문 답변이 일치하면 짧은 유효기간의 재설정 토큰을 발급한다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/admin/password-reset/verify` |
| StatusCode | `200`, `400`, `401`, `404`, `422` |

Request:

```json
{
  "loginId": "admin",
  "questionId": "security-question-uuid",
  "securityAnswer": "보안 질문 답변"
}
```

Response:

```json
{
  "data": {
    "resetToken": "short-lived-reset-token",
    "expiresIn": 600
  }
}
```

### 관리자 비밀번호 재설정

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/admin/password-reset` |
| StatusCode | `204`, `400`, `401`, `422` |

Request:

```json
{
  "resetToken": "short-lived-reset-token",
  "newPassword": "new-password"
}
```

Response 본문은 없다. 재설정이 완료되면 기존 로그인 세션과 리프레시 토큰을 폐기한다.

### 액세스 토큰 재발급

강사와 학생이 공통으로 사용한다. 유효한 리프레시 토큰을 검증한 뒤 새 토큰 쌍을 발급하고 기존 리프레시 토큰은 폐기한다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/refresh` |
| StatusCode | `200`, `400`, `401` |

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response:

```json
{
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
}
```

### 로그아웃

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/logout` |
| StatusCode | `204`, `400`, `401` |

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response 본문은 없다. 서버는 전달받은 리프레시 토큰을 폐기한다.

## 강사용 API

강사용 웹은 `POST /api/auth/teacher/login`으로 로그인하며, 발급된 JWT의 `role`은 `teacher`이다. `/api/admin/**` 경로는 이 `teacher` 역할이 사용하는 강사용 관리 API이며 학생 JWT로 접근하면 `403`을 반환한다.

## 관리자 대시보드

### 관리자 대시보드 요약 조회

관리자 대시보드에서 사용하는 최신 요약 지표, 최근 배포 문제집, 최근 제출 및 성적을 한 번에 조회한다. JWT 인증과 `teacher` 역할이 필요하며 `student` 역할은 `403`을 반환한다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/dashboard` |
| StatusCode | `200`, `401`, `403` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "summary": {
      "totalStudents": 32,
      "totalCohorts": 3,
      "totalWorkbooks": 12,
      "averageScore": 78.25
    },
    "recentAssignments": [
      {
        "assignmentId": "assignment-uuid",
        "workbookId": "workbook-uuid",
        "workbookTitle": "기본간호 문제집 1",
        "cohortId": "cohort-uuid",
        "cohortName": "2026년 1기",
        "status": "open",
        "questionCount": 20,
        "submissionCount": 28,
        "closesAt": "2026-06-30T23:59:59.000Z",
        "assignedAt": "2026-06-18T09:00:00.000Z"
      }
    ],
    "recentSubmissions": [
      {
        "submissionId": "submission-uuid",
        "assignmentId": "assignment-uuid",
        "workbookId": "workbook-uuid",
        "workbookTitle": "기본간호 문제집 1",
        "studentId": "student-uuid",
        "studentName": "김학생",
        "cohortId": "cohort-uuid",
        "cohortName": "2026년 1기",
        "attemptNo": 2,
        "status": "graded",
        "score": 85,
        "submittedAt": "2026-06-18T09:40:00.000Z"
      }
    ]
  }
}
```

집계 및 정렬 기준:

- `totalStudents`: soft-delete되지 않은 학생과 사용자 계정 수
- `totalCohorts`: soft-delete되지 않은 전체 기수 수
- `totalWorkbooks`: soft-delete되지 않은 전체 문제집 수
- `averageScore`: soft-delete되지 않은 `graded` 제출 점수의 평균, 소수점 둘째 자리까지 반환
- `recentAssignments`: soft-delete되지 않은 배포를 `created_at` 최신순으로 최대 5건 반환
- `questionCount`: soft-delete되지 않은 문제집 문항과 문제만 집계
- `submissionCount`: soft-delete되지 않은 `submitted`, `graded` 제출만 집계
- `recentSubmissions`: 제출일이 있는 `submitted`, `graded` 제출을 `submitted_at` 최신순으로 최대 6건 반환
- 데이터가 없으면 요약 수치는 `0`, 최근 목록은 빈 배열을 반환

## 기수 CRUD

### 기수 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/cohorts` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `keyword`, `isActive`, `page`, `limit`

Example: `GET /api/admin/cohorts?keyword=2026&isActive=true&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "cohort-uuid",
      "name": "2026년 1기",
      "code": "2026-01",
      "description": "오전반",
      "startsOn": "2026-03-01",
      "endsOn": "2026-08-31",
      "isActive": true,
      "studentCount": 32,
      "createdAt": "2026-06-18T09:00:00+09:00",
      "updatedAt": "2026-06-18T09:00:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 기수 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/cohorts` |
| StatusCode | `201`, `400`, `401`, `403`, `409`, `422` |

Request:

```json
{
  "name": "2026년 1기",
  "code": "2026-01",
  "description": "오전반",
  "startsOn": "2026-03-01",
  "endsOn": "2026-08-31",
  "isActive": true
}
```

Response:

```json
{
  "data": {
    "id": "cohort-uuid",
    "name": "2026년 1기",
    "code": "2026-01",
    "description": "오전반",
    "startsOn": "2026-03-01",
    "endsOn": "2026-08-31",
    "isActive": true,
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 기수 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/cohorts/{cohortId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "cohort-uuid",
    "name": "2026년 1기",
    "code": "2026-01",
    "description": "오전반",
    "startsOn": "2026-03-01",
    "endsOn": "2026-08-31",
    "isActive": true,
    "studentCount": 32,
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 기수 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/cohorts/{cohortId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "name": "2026년 1기 수정",
  "description": "오전반",
  "isActive": false
}
```

Response:

```json
{
  "data": {
    "id": "cohort-uuid",
    "name": "2026년 1기 수정",
    "code": "2026-01",
    "description": "오전반",
    "startsOn": "2026-03-01",
    "endsOn": "2026-08-31",
    "isActive": false,
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 기수 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/cohorts/{cohortId}` |
| StatusCode | `204`, `401`, `403`, `404`, `409` |

Request:

```json
{}
```

Response:

```json
{}
```

## 학생 CRUD

### 학생 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/students` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `cohortId`, `status`, `keyword`, `page`, `limit`

Example: `GET /api/admin/students?cohortId=cohort-uuid&status=active&keyword=김&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "student-uuid",
      "userId": "user-uuid",
      "name": "김학생",
      "loginId": "student01",
      "email": "student@example.com",
      "phone": "010-0000-0000",
      "cohort": {
        "id": "cohort-uuid",
        "name": "2026년 1기"
      },
      "studentNo": "S-0001",
      "status": "active",
      "enrolledOn": "2026-03-01",
      "completedOn": null,
      "createdAt": "2026-06-18T09:00:00+09:00",
      "updatedAt": "2026-06-18T09:00:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 학생 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/students` |
| StatusCode | `201`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "name": "김학생",
  "loginId": "student01",
  "email": "student@example.com",
  "password": "initial-password",
  "phone": "010-0000-0000",
  "cohortId": "cohort-uuid",
  "studentNo": "S-0001",
  "status": "active",
  "enrolledOn": "2026-03-01",
  "memo": "신규 등록"
}
```

Response:

```json
{
  "data": {
    "id": "student-uuid",
    "userId": "user-uuid",
    "name": "김학생",
    "loginId": "student01",
    "email": "student@example.com",
    "phone": "010-0000-0000",
    "cohortId": "cohort-uuid",
    "studentNo": "S-0001",
    "status": "active",
    "enrolledOn": "2026-03-01",
    "completedOn": null,
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 학생 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/students/{studentId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "student-uuid",
    "userId": "user-uuid",
    "name": "김학생",
    "loginId": "student01",
    "email": "student@example.com",
    "phone": "010-0000-0000",
    "cohort": {
      "id": "cohort-uuid",
      "name": "2026년 1기"
    },
    "studentNo": "S-0001",
    "status": "active",
    "enrolledOn": "2026-03-01",
    "completedOn": null,
    "memo": "신규 등록",
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 학생 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/students/{studentId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "name": "김학생",
  "phone": "010-1111-2222",
  "cohortId": "cohort-uuid",
  "status": "paused",
  "memo": "휴원"
}
```

Response:

```json
{
  "data": {
    "id": "student-uuid",
    "name": "김학생",
    "phone": "010-1111-2222",
    "cohortId": "cohort-uuid",
    "status": "paused",
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 학생 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/students/{studentId}` |
| StatusCode | `204`, `401`, `403`, `404` |

Request:

```json
{}
```

Response:

```json
{}
```

## 문제 CRUD

문제(`Question`) 필드는 웹과 앱에서 아래 이름을 공통으로 사용한다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | UUID | 문제 ID |
| `createdBy` | UUID | 생성한 강사 사용자 ID |
| `subject` | string | 과목 |
| `category` | string \| null | 세부 분류 |
| `difficulty` | `easy \| medium \| hard` | 난이도 |
| `type` | `multiple_choice` | 문제 유형 |
| `content` | string | 문제 본문 |
| `choices` | Choice[] | 객관식 선지. 각 선지는 `id`, `text`를 가진다. 2개 이상, 최대 5개까지 지원한다. |
| `correctAnswerIndex` | integer | 정답 선지의 0부터 시작하는 배열 인덱스. 학생 풀이 전 응답에서는 제외한다. |
| `status` | `draft \| published \| archived` | 콘텐츠 상태 |
| `createdAt` | ISO 8601 datetime | 생성 일시 |
| `updatedAt` | ISO 8601 datetime | 수정 일시 |

### 문제 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/questions` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `type`, `difficulty`, `subject`, `category`, `status`, `keyword`, `page`, `limit`

Example: `GET /api/admin/questions?type=multiple_choice&difficulty=medium&subject=기본간호학&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "question-uuid",
      "createdBy": "user-uuid",
      "subject": "기본간호학",
      "category": "활력징후",
      "difficulty": "medium",
      "type": "multiple_choice",
      "content": "다음 중 활력징후에 해당하는 것은?",
      "choices": [
        { "id": "choice-1", "text": "혈압" },
        { "id": "choice-2", "text": "키" }
      ],
      "correctAnswerIndex": 0,
      "status": "published",
      "createdAt": "2026-06-18T09:00:00+09:00",
      "updatedAt": "2026-06-18T09:00:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 문제 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/questions` |
| StatusCode | `201`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "subject": "기본간호학",
  "category": "활력징후",
  "difficulty": "medium",
  "type": "multiple_choice",
  "content": "다음 중 활력징후에 해당하는 것은?",
  "choices": [
    { "id": "choice-1", "text": "혈압" },
    { "id": "choice-2", "text": "키" },
    { "id": "choice-3", "text": "몸무게" },
    { "id": "choice-4", "text": "시력" },
    { "id": "choice-5", "text": "청력" }
  ],
  "correctAnswerIndex": 0,
  "status": "draft"
}
```

Response:

```json
{
  "data": {
    "id": "question-uuid",
    "createdBy": "user-uuid",
    "subject": "기본간호학",
    "category": "활력징후",
    "difficulty": "medium",
    "type": "multiple_choice",
    "content": "다음 중 활력징후에 해당하는 것은?",
    "choices": [
      { "id": "choice-1", "text": "혈압" },
      { "id": "choice-2", "text": "키" },
      { "id": "choice-3", "text": "몸무게" },
      { "id": "choice-4", "text": "시력" },
      { "id": "choice-5", "text": "청력" }
    ],
    "correctAnswerIndex": 0,
    "status": "draft",
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/questions/{questionId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "question-uuid",
    "createdBy": "user-uuid",
    "subject": "기본간호학",
    "category": "활력징후",
    "difficulty": "medium",
    "type": "multiple_choice",
    "content": "다음 중 활력징후에 해당하는 것은?",
    "choices": [
      { "id": "choice-1", "text": "혈압" }
    ],
    "correctAnswerIndex": 0,
    "status": "published",
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/questions/{questionId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `422` |

Request:

```json
{
  "content": "다음 중 활력징후에 포함되는 것은?",
  "difficulty": "hard",
  "choices": [
    { "text": "혈압" },
    { "text": "키" },
    { "text": "몸무게" },
    { "text": "시력" },
    { "text": "청력" }
  ],
  "correctAnswerIndex": 0
}
```

Response:

```json
{
  "data": {
    "id": "question-uuid",
    "content": "다음 중 활력징후에 포함되는 것은?",
    "difficulty": "hard",
    "correctAnswerIndex": 0,
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 문제 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/questions/{questionId}` |
| StatusCode | `204`, `401`, `403`, `404`, `409` |

Request:

```json
{}
```

Response:

```json
{}
```

### PDF 문제 일괄 등록 미리보기

텍스트 기반 문제지 PDF와 정답지 PDF를 업로드해 문제·보기·정답·과목을 추출한다. 원본 PDF는 서버에 영구 저장하지 않는다.
백엔드는 Poppler `pdftotext -bbox-layout`로 페이지별 단어 좌표를 추출하고, 2단 레이아웃은 좌측 열 전체 → 우측 열 전체 순서로 재구성한 뒤 문항을 파싱한다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/questions/pdf-import/preview` |
| Content-Type | `multipart/form-data` |
| StatusCode | `200`, `400`, `401`, `403`, `422`, `500` |

Form fields:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `questionPdf` | file | 문제지 PDF. `application/pdf`, 최대 10MB |
| `answerPdf` | file | 정답지 PDF. `application/pdf`, 최대 10MB |

Response:

```json
{
  "data": {
    "items": [
      {
        "questionNumber": 1,
        "subject": "기초간호학개요",
        "category": null,
        "content": "다음 중 활력징후에 해당하는 것은?",
        "choices": ["혈압", "키", "몸무게", "시력", "청력"],
        "correctAnswerIndex": 0,
        "answerNumber": 1,
        "status": "ready",
        "reasons": []
      }
    ],
    "summary": {
      "total": 1,
      "ready": 1,
      "needsReview": 0,
      "invalid": 0
    }
  }
}
```

미리보기 상태:

- `ready`: 본문, 보기 2~5개, 정답 1~5번 매칭이 완료된 문항
- `needs_review`: 그림·도표·자료형 문항 등 자동 추출은 됐지만 강사 검토가 필요한 문항
- `invalid`: 본문, 보기, 정답이 누락되었거나 정답 번호가 보기 범위를 벗어난 문항. 깨진 문자(`�`, `□` 등) 또는 비정상적으로 짧은 본문도 `ready`가 될 수 없다.

문항/정답 파싱 규칙:

- 문항 시작: 줄 시작의 `1.`, `1)`, `문제 1.` 형식을 우선 지원한다.
- 보기: `①~⑤`, `1)~5)`, `1.~5.` 형식을 지원한다.
- 여러 페이지와 여러 텍스트 스트림을 페이지 순서대로 분석한다.
- 2단 레이아웃은 좌표를 기준으로 행을 구성한 뒤 좌우 열을 분리한다.
- 정답지는 `교시`, `과목`, `문제번호`, `최종답안`이 함께 있는 행에서 문제번호별 과목과 답안 `1~5`를 수집한다.
- 정답지에서 과목 셀이 병합되어 다음 행에 문제번호와 답안만 이어지는 경우, 직전에 추출한 과목을 같은 문제번호 매핑에 사용한다.
- 문제번호 기준 과목 매핑에 실패하면 `PDF 가져오기`를 fallback으로 표시하고 미리보기 사유에 검토 메시지를 포함한다.
- 전체 문서가 하나의 문항으로 합쳐진 것으로 판단되면 문항 경계 실패로 처리한다.

주요 오류 코드:

- `PDF_TEXT_EXTRACTOR_NOT_INSTALLED`: 서버 런타임에 Poppler `pdftotext`가 설치되어 있지 않다.
- `PDF_TEXT_EXTRACTION_FAILED`: PDF 텍스트 추출에 실패했다.
- `PDF_QUESTION_PARSE_FAILED`: 문제지에서 문항을 찾지 못했다.
- `PDF_QUESTION_BOUNDARY_FAILED`: 문항 경계를 안정적으로 분리하지 못했다.

### PDF 문제 일괄 등록 확정 생성

강사가 미리보기에서 검토·수정·선택한 문항만 문제은행에 `draft` 상태로 생성한다. 문제집, 배포, 기수, 학생 데이터는 생성하거나 수정하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/questions/pdf-import/confirm` |
| StatusCode | `201`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "permissionConfirmed": true,
  "questions": [
    {
      "questionNumber": 1,
      "subject": "기초간호학개요",
      "category": null,
      "difficulty": "medium",
      "content": "다음 중 활력징후에 해당하는 것은?",
      "choices": ["혈압", "키", "몸무게", "시력", "청력"],
      "correctAnswerIndex": 0
    }
  ]
}
```

Response:

```json
{
  "data": {
    "createdCount": 1,
    "questions": [
      {
        "id": "question-uuid",
        "subject": "기본간호학",
        "category": null,
        "difficulty": "medium",
        "type": "multiple_choice",
        "content": "다음 중 활력징후에 해당하는 것은?",
        "choices": [
          { "id": "choice-1", "text": "혈압" },
          { "id": "choice-2", "text": "키" },
          { "id": "choice-3", "text": "몸무게" },
          { "id": "choice-4", "text": "시력" },
          { "id": "choice-5", "text": "청력" }
        ],
        "correctAnswerIndex": 0,
        "answerKey": 0,
        "status": "draft",
        "createdAt": "2026-06-18T09:00:00+09:00",
        "updatedAt": "2026-06-18T09:00:00+09:00"
      }
    ]
  }
}
```

## 문제집 CRUD

### 문제집 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/workbooks` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `status`, `keyword`, `page`, `limit`

Example: `GET /api/admin/workbooks?status=draft&keyword=기본간호&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "workbook-uuid",
      "title": "기본간호 문제집 1",
      "description": "1주차 복습",
      "status": "draft",
      "passScore": 70,
      "questionCount": 20,
      "createdAt": "2026-06-18T09:00:00+09:00",
      "updatedAt": "2026-06-18T09:00:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 문제집 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/workbooks` |
| StatusCode | `201`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "title": "기본간호 문제집 1",
  "description": "1주차 복습",
  "status": "draft",
  "passScore": 70,
  "questions": [
    {
      "questionId": "question-uuid",
      "sequence": 1,
      "points": 5,
      "isRequired": true
    }
  ]
}
```

Response:

```json
{
  "data": {
    "id": "workbook-uuid",
    "createdByTeacherId": "teacher-uuid",
    "title": "기본간호 문제집 1",
    "description": "1주차 복습",
    "status": "draft",
    "passScore": 70,
    "questions": [
      {
        "id": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "points": 5,
        "isRequired": true
      }
    ],
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제집 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/workbooks/{workbookId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "workbook-uuid",
    "title": "기본간호 문제집 1",
    "description": "1주차 복습",
    "status": "draft",
    "passScore": 70,
    "questions": [
      {
        "id": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "points": 5,
        "isRequired": true,
        "question": {
          "type": "multiple_choice",
          "content": "다음 중 활력징후에 해당하는 것은?",
          "choices": [
            { "id": "choice-1", "text": "혈압" }
          ]
        }
      }
    ],
    "assignments": [
      {
        "id": "assignment-uuid",
        "cohortId": "cohort-uuid",
        "cohortName": "2026년 1기",
        "status": "open"
      }
    ],
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제집 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/workbooks/{workbookId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "title": "기본간호 문제집 1 수정",
  "description": "1주차 복습 수정",
  "status": "published",
  "passScore": 80
}
```

Response:

```json
{
  "data": {
    "id": "workbook-uuid",
    "title": "기본간호 문제집 1 수정",
    "description": "1주차 복습 수정",
    "status": "published",
    "passScore": 80,
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 문제집 문항 구성 변경

| 항목 | 내용 |
| --- | --- |
| Method | `PUT` |
| URL | `/api/admin/workbooks/{workbookId}/questions` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "questions": [
    {
      "questionId": "question-uuid",
      "sequence": 1,
      "points": 5,
      "isRequired": true
    },
    {
      "questionId": "question-uuid-2",
      "sequence": 2,
      "points": 5,
      "isRequired": true
    }
  ]
}
```

Response:

```json
{
  "data": {
    "workbookId": "workbook-uuid",
    "questions": [
      {
        "id": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "points": 5,
        "isRequired": true
      },
      {
        "id": "workbook-question-uuid-2",
        "questionId": "question-uuid-2",
        "sequence": 2,
        "points": 5,
        "isRequired": true
      }
    ],
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 문제집 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/workbooks/{workbookId}` |
| StatusCode | `204`, `401`, `403`, `404`, `409` |

Request:

```json
{}
```

Response:

```json
{}
```

## 문제집 배포

### 문제집 배포 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/workbooks/{workbookId}/assignments` |
| StatusCode | `201`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "cohortId": "cohort-uuid",
  "status": "open",
  "opensAt": "2026-06-18T09:00:00+09:00",
  "closesAt": "2026-06-30T23:59:59+09:00",
  "maxAttempts": 3
}
```

Response:

```json
{
  "data": {
    "id": "assignment-uuid",
    "workbookId": "workbook-uuid",
    "cohortId": "cohort-uuid",
    "assignedByTeacherId": "teacher-uuid",
    "status": "open",
    "opensAt": "2026-06-18T09:00:00+09:00",
    "closesAt": "2026-06-30T23:59:59+09:00",
    "maxAttempts": 3,
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제집 배포 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/workbook-assignments` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `workbookId`, `cohortId`, `status`, `page`, `limit`

Example: `GET /api/admin/workbook-assignments?workbookId=workbook-uuid&cohortId=cohort-uuid&status=open&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "assignment-uuid",
      "workbook": {
        "id": "workbook-uuid",
        "title": "기본간호 문제집 1"
      },
      "cohort": {
        "id": "cohort-uuid",
        "name": "2026년 1기"
      },
      "status": "open",
      "opensAt": "2026-06-18T09:00:00+09:00",
      "closesAt": "2026-06-30T23:59:59+09:00",
      "maxAttempts": 3,
      "submissionCount": 12,
      "createdAt": "2026-06-18T09:00:00+09:00",
      "updatedAt": "2026-06-18T09:00:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 문제집 배포 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/workbook-assignments/{assignmentId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "assignment-uuid",
    "workbook": {
      "id": "workbook-uuid",
      "title": "기본간호 문제집 1"
    },
    "cohort": {
      "id": "cohort-uuid",
      "name": "2026년 1기"
    },
    "status": "open",
    "opensAt": "2026-06-18T09:00:00+09:00",
    "closesAt": "2026-06-30T23:59:59+09:00",
    "maxAttempts": 3,
    "createdAt": "2026-06-18T09:00:00+09:00",
    "updatedAt": "2026-06-18T09:00:00+09:00"
  }
}
```

### 문제집 배포 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/workbook-assignments/{assignmentId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "status": "closed",
  "closesAt": "2026-06-25T23:59:59+09:00",
  "maxAttempts": 2
}
```

Response:

```json
{
  "data": {
    "id": "assignment-uuid",
    "status": "closed",
    "closesAt": "2026-06-25T23:59:59+09:00",
    "maxAttempts": 2,
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 문제집 배포 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/workbook-assignments/{assignmentId}` |
| StatusCode | `204`, `401`, `403`, `404`, `409` |

Request:

```json
{}
```

Response:

```json
{}
```

## 학생 앱 API

학생 앱 API는 학생 인증이 필요하다.

### 학생 앱 공통 계약

- 학생이 접근할 수 있는 기수와 문제집만 반환한다. 요청의 `cohortId`는 인증된 학생의 소속 여부를 반드시 검증한다.
- 배포 상태와 풀이 상태를 서로 다른 필드로 관리한다.
  - `assignmentStatus`: `scheduled | open | closed`
  - `learningStatus`: `notStarted | inProgress | retrying | submitted`
- `learningStatus`는 서버가 제출 및 임시 저장 데이터로부터 계산하며 클라이언트가 임의로 변경하지 않는다.
  - `notStarted`: 제출과 임시 저장이 모두 없음
  - `inProgress`: 제출 이력 없이 임시 저장이 있음
  - `retrying`: 제출 이력이 있고 새 임시 저장이 있음
  - `submitted`: 제출 이력이 있고 활성 임시 저장이 없음
- 진행률은 `answeredQuestionCount / totalQuestions * 100`으로 계산하고 0~100 범위의 정수로 반환한다.
- 재풀이 횟수가 통계를 부풀리지 않도록 기수별 성적 요약은 문제집별 최신 제출 1건을 기준으로 계산한다.
- 오답정리는 같은 문제를 여러 번 틀려도 `questionId`별 1건만 반환하며, 가장 최근 오답의 선택 내용을 사용한다.
- 학생 앱 응답에는 해설을 포함하지 않는다. 제출 상세와 오답정리는 모든 선지, 학생 선택 선지, 정답 선지만 제공한다.

백엔드 구현 전제:

- `loginId` 로그인을 위해 사용자 데이터에 고유한 `login_id`가 필요하다.
- 선지 `id`는 답안 임시 저장과 제출 후에도 바뀌지 않는 영속 식별자여야 한다. 현재 선지를 문자열 배열로만 저장한다면 선지별 ID를 저장하도록 스키마를 보완한다.
- 학생이 여러 기수에 참여할 수 있다면 학생-기수 관계를 별도 소속 테이블로 관리한다. 현재 1인 1기수 모델을 유지하면 내 기수 목록은 최대 1건을 반환한다.
- 풀이 진행 상태는 학생과 배포 문제집 조합당 활성 1건만 허용한다. 별도 진행 테이블 또는 `in_progress` 제출 레코드로 구현할 수 있다.

### 내 정보 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/me` |
| StatusCode | `200`, `401`, `403` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "studentId": "student-uuid",
    "name": "홍길동",
    "loginId": "student01",
    "cohorts": [
      {
        "id": "cohort-uuid",
        "name": "2026년 4월 요양보호사반",
        "startDate": "2026-04-01",
        "endDate": "2026-09-30",
        "status": "active"
      }
    ]
  }
}
```

학생 앱 로그인과 프로필 표시에는 `loginId`를 사용한다. 이메일은 학생 연락처로 선택 입력할 수 있으며, 사용자 테이블에는 고유한 `login_id` 필드가 필요하다.

### 내 기수 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/cohorts` |
| StatusCode | `200`, `401`, `403` |

Query parameters: 없음

Response:

```json
{
  "data": [
    {
      "id": "cohort-uuid",
      "name": "2026년 4월 요양보호사반",
      "startDate": "2026-04-01",
      "endDate": "2026-09-30",
      "status": "active"
    }
  ]
}
```

### 내 배포 문제집 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/workbooks` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `cohortId`, `assignmentStatus`, `learningStatus`, `subject`, `page`, `limit`

Example: `GET /api/app/workbooks?cohortId=cohort-uuid&assignmentStatus=open&learningStatus=inProgress&subject=기초간호학&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "assignmentId": "assignment-uuid",
      "workbookId": "workbook-uuid",
      "title": "기본간호 문제집 1",
      "description": "1주차 복습",
      "subject": "기초간호학",
      "subjects": ["기초간호학"],
      "chapterCount": 3,
      "assignmentStatus": "open",
      "learningStatus": "inProgress",
      "opensAt": "2026-06-18T09:00:00+09:00",
      "closesAt": "2026-06-30T23:59:59+09:00",
      "maxAttempts": 3,
      "attemptCount": 1,
      "totalQuestions": 20,
      "estimatedMinutes": 30,
      "progress": {
        "currentQuestionIndex": 7,
        "answeredQuestionCount": 8,
        "totalQuestions": 20,
        "rate": 40
      },
      "latestResult": null,
      "bestScore": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

`subject`는 대표 과목이며, 여러 과목의 문제가 섞인 문제집은 `"혼합"`으로 반환한다. `subjects`에는 포함된 전체 과목을 반환하고 과목 필터는 이 배열의 포함 여부를 기준으로 적용한다.

### 내 배포 문제집 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/workbook-assignments/{assignmentId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "assignmentId": "assignment-uuid",
    "workbookId": "workbook-uuid",
    "title": "기본간호 문제집 1",
    "description": "1주차 복습",
    "subject": "기초간호학",
    "subjects": ["기초간호학"],
    "chapterCount": 3,
    "totalQuestions": 20,
    "estimatedMinutes": 30,
    "assignmentStatus": "open",
    "learningStatus": "inProgress",
    "passScore": 70,
    "opensAt": "2026-06-18T09:00:00+09:00",
    "closesAt": "2026-06-30T23:59:59+09:00",
    "maxAttempts": 3,
    "attemptCount": 0,
    "progress": {
      "currentQuestionIndex": 0,
      "answeredQuestionCount": 1,
      "totalQuestions": 20,
      "rate": 5,
      "answers": [
        {
          "workbookQuestionId": "workbook-question-uuid",
          "selectedChoiceId": "choice-1"
        }
      ],
      "updatedAt": "2026-06-18T09:15:00+09:00"
    },
    "questions": [
      {
        "workbookQuestionId": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "points": 5,
        "type": "multiple_choice",
        "content": "다음 중 활력징후에 해당하는 것은?",
        "choices": [
          { "id": "choice-1", "text": "혈압" },
          { "id": "choice-2", "text": "키" }
        ]
      }
    ]
  }
}
```

### 풀이 진행 상태 저장

답안 선택 또는 현재 문제 이동 시 호출한다. 동일한 내용으로 여러 번 호출해도 같은 상태가 되는 멱등 API이다.

| 항목 | 내용 |
| --- | --- |
| Method | `PUT` |
| URL | `/api/app/workbook-assignments/{assignmentId}/progress` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "currentQuestionIndex": 7,
  "answers": [
    {
      "workbookQuestionId": "workbook-question-uuid",
      "selectedChoiceId": "choice-1"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "assignmentId": "assignment-uuid",
    "learningStatus": "inProgress",
    "currentQuestionIndex": 7,
    "answeredQuestionCount": 8,
    "totalQuestions": 20,
    "rate": 40,
    "answers": [
      {
        "workbookQuestionId": "workbook-question-uuid",
        "selectedChoiceId": "choice-1"
      }
    ],
    "updatedAt": "2026-06-18T09:20:00+09:00"
  }
}
```

이미 제출한 문제집에 새 진행 상태가 저장되면 서버는 `learningStatus`를 `retrying`으로 계산한다. 제출이 완료되면 활성 진행 상태를 삭제하거나 완료 처리하여 `submitted`로 반환한다.

### 풀이 진행 상태 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/workbook-assignments/{assignmentId}/progress` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response 형식은 풀이 진행 상태 저장 API와 같다. 저장된 진행 상태가 없으면 `data`는 `null`이다.

## 문제 제출

### 문제 제출 생성

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/app/workbook-assignments/{assignmentId}/submissions` |
| StatusCode | `201`, `400`, `401`, `403`, `404`, `409`, `422` |

Request:

```json
{
  "startedAt": "2026-06-18T09:10:00+09:00",
  "answers": [
    {
      "workbookQuestionId": "workbook-question-uuid",
      "selectedChoiceId": "choice-1"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "id": "submission-uuid",
    "workbookAssignmentId": "assignment-uuid",
    "workbookId": "workbook-uuid",
    "workbookTitle": "기본간호 문제집 1",
    "cohortId": "cohort-uuid",
    "studentId": "student-uuid",
    "attemptNo": 2,
    "status": "graded",
    "startedAt": "2026-06-18T09:10:00+09:00",
    "submittedAt": "2026-06-18T09:40:00+09:00",
    "gradedAt": "2026-06-18T09:40:01+09:00",
    "totalPoints": 100,
    "earnedPoints": 85,
    "score": 85,
    "correctCount": 17,
    "wrongCount": 3,
    "totalQuestions": 20,
    "correctRate": 85,
    "learningStatus": "submitted",
    "gradedAnswers": [
      {
        "id": "submission-answer-uuid",
        "workbookQuestionId": "workbook-question-uuid",
        "questionId": "question-uuid",
        "questionContent": "다음 중 활력징후에 해당하는 것은?",
        "choices": [
          { "id": "choice-1", "text": "혈압" },
          { "id": "choice-2", "text": "키" }
        ],
        "selectedChoiceId": "choice-1",
        "selectedChoiceText": "혈압",
        "correctChoiceId": "choice-1",
        "correctChoiceText": "혈압",
        "isCorrect": true,
        "earnedPoints": 5,
        "gradedAt": "2026-06-18T09:40:01+09:00"
      }
    ],
    "createdAt": "2026-06-18T09:40:01+09:00",
    "updatedAt": "2026-06-18T09:40:01+09:00"
  }
}
```

권한 및 검증:

- 학생의 `cohort_id`와 `workbook_assignments.cohort_id`가 일치해야 한다.
- 배포 상태가 `open`이어야 한다.
- 현재 시간이 `opens_at`, `closes_at` 범위 안이어야 한다.
- `max_attempts`를 초과하면 `409`를 반환한다.
- `submittedAt`, `gradedAt`, 점수, 정답 여부는 서버가 계산한다.
- 제출 성공 후 해당 배포의 활성 풀이 진행 상태를 완료 처리하고 `learningStatus`를 `submitted`로 변경한다.

### 내 제출 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/submissions` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `cohortId`, `assignmentId`, `page`, `limit`

Example: `GET /api/app/submissions?cohortId=cohort-uuid&assignmentId=assignment-uuid&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "submission-uuid",
      "assignmentId": "assignment-uuid",
      "workbookTitle": "기본간호 문제집 1",
      "attemptNo": 2,
      "status": "graded",
      "score": 85,
      "correctCount": 17,
      "wrongCount": 3,
      "totalQuestions": 20,
      "correctRate": 85,
      "submittedAt": "2026-06-18T09:40:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 내 제출 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/submissions/{submissionId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "id": "submission-uuid",
    "assignmentId": "assignment-uuid",
    "workbookTitle": "기본간호 문제집 1",
    "attemptNo": 2,
    "status": "graded",
    "score": 85,
    "correctCount": 17,
    "wrongCount": 3,
    "totalQuestions": 20,
    "correctRate": 85,
    "submittedAt": "2026-06-18T09:40:00+09:00",
    "gradedAnswers": [
      {
        "workbookQuestionId": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "questionContent": "다음 중 활력징후에 해당하는 것은?",
        "choices": [
          { "id": "choice-1", "text": "혈압" },
          { "id": "choice-2", "text": "키" },
          { "id": "choice-3", "text": "몸무게" },
          { "id": "choice-4", "text": "시력" }
        ],
        "selectedChoiceId": "choice-2",
        "selectedChoiceText": "키",
        "correctChoiceId": "choice-1",
        "correctChoiceText": "혈압",
        "isCorrect": false,
        "earnedPoints": 0
      }
    ]
  }
}
```

### 내 오답정리 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/wrong-answers` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `cohortId`, `assignmentId`

Example: `GET /api/app/wrong-answers?cohortId=cohort-uuid&assignmentId=assignment-uuid`

Response:

```json
{
  "data": [
    {
      "assignmentId": "assignment-uuid",
      "workbookId": "workbook-uuid",
      "workbookTitle": "기본간호 문제집 1",
      "latestSubmittedAt": "2026-06-18T09:40:00+09:00",
      "latestScore": 85,
      "latestCorrectRate": 85,
      "wrongQuestionCount": 1,
      "wrongAnswers": [
        {
          "questionId": "question-uuid",
          "workbookQuestionId": "workbook-question-uuid",
          "sequence": 1,
          "questionContent": "다음 중 활력징후에 해당하는 것은?",
          "choices": [
            { "id": "choice-1", "text": "혈압" },
            { "id": "choice-2", "text": "키" },
            { "id": "choice-3", "text": "몸무게" },
            { "id": "choice-4", "text": "시력" }
          ],
          "selectedChoiceId": "choice-2",
          "selectedChoiceText": "키",
          "correctChoiceId": "choice-1",
          "correctChoiceText": "혈압",
          "isCorrect": false,
          "lastWrongAt": "2026-06-18T09:40:00+09:00"
        }
      ]
    }
  ]
}
```

오답은 `questionId`를 기준으로 중복 제거한다. 같은 문제를 여러 번 틀렸다면 가장 최근 오답 제출의 `selectedChoiceId`와 `lastWrongAt`을 반환한다. 오답이 없으면 `data`는 빈 배열이다.

### 기수별 내 성적 요약 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/app/cohorts/{cohortId}/performance-summary` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "cohortId": "cohort-uuid",
    "cohortName": "2026년 4월 요양보호사반",
    "solvedWorkbookCount": 3,
    "correctCount": 51,
    "totalQuestions": 60,
    "correctRate": 85
  }
}
```

`solvedWorkbookCount`, `correctCount`, `totalQuestions`, `correctRate`는 해당 기수에서 제출한 문제집별 최신 제출 1건만 사용하여 계산한다. 제출이 없으면 모든 수치는 `0`이다.

## 성적 조회

### 강사용 성적 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/results` |
| StatusCode | `200`, `401`, `403` |

Query parameters: `cohortId`, `workbookId`, `assignmentId`, `studentId`, `page`, `limit`

Example: `GET /api/admin/results?cohortId=cohort-uuid&workbookId=workbook-uuid&assignmentId=assignment-uuid&studentId=student-uuid&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "submissionId": "submission-uuid",
      "assignmentId": "assignment-uuid",
      "workbook": {
        "id": "workbook-uuid",
        "title": "기본간호 문제집 1"
      },
      "cohort": {
        "id": "cohort-uuid",
        "name": "2026년 1기"
      },
      "student": {
        "id": "student-uuid",
        "name": "김학생",
        "studentNo": "S-0001"
      },
      "attemptNo": 2,
      "status": "graded",
      "score": 85,
      "totalPoints": 100,
      "earnedPoints": 85,
      "correctCount": 17,
      "wrongCount": 3,
      "submittedAt": "2026-06-18T09:40:00+09:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### 강사용 성적 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/results/{submissionId}` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: 없음

Response:

```json
{
  "data": {
    "submissionId": "submission-uuid",
    "assignmentId": "assignment-uuid",
    "workbook": {
      "id": "workbook-uuid",
      "title": "기본간호 문제집 1"
    },
    "cohort": {
      "id": "cohort-uuid",
      "name": "2026년 1기"
    },
    "student": {
      "id": "student-uuid",
      "name": "김학생",
      "studentNo": "S-0001"
    },
    "attemptNo": 2,
    "status": "graded",
    "score": 85,
    "totalPoints": 100,
    "earnedPoints": 85,
    "correctCount": 17,
    "wrongCount": 3,
    "submittedAt": "2026-06-18T09:40:00+09:00",
    "answers": [
      {
        "workbookQuestionId": "workbook-question-uuid",
        "questionId": "question-uuid",
        "sequence": 1,
        "content": "다음 중 활력징후에 해당하는 것은?",
        "choices": [
          { "id": "choice-1", "text": "혈압" },
          { "id": "choice-2", "text": "키" }
        ],
        "selectedChoiceId": "choice-1",
        "correctChoiceId": "choice-1",
        "isCorrect": true,
        "earnedPoints": 5
      }
    ]
  }
}
```

### 기수별 성적 요약 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/cohorts/{cohortId}/results/summary` |
| StatusCode | `200`, `401`, `403`, `404` |

Query parameters: `workbookId`, `assignmentId`

Example: `GET /api/admin/cohorts/{cohortId}/results/summary?workbookId=workbook-uuid&assignmentId=assignment-uuid`

Response:

```json
{
  "data": {
    "cohort": {
      "id": "cohort-uuid",
      "name": "2026년 1기"
    },
    "workbook": {
      "id": "workbook-uuid",
      "title": "기본간호 문제집 1"
    },
    "studentCount": 32,
    "submittedStudentCount": 28,
    "averageScore": 78.25,
    "highestScore": 100,
    "lowestScore": 45,
    "passCount": 21
  }
}
```

## 권한 검증 규칙

- `/api/admin/**` 강사용 관리 API는 강사용 로그인에서 발급된 `role: teacher` JWT로 접근한다.
- 학생 앱 API는 `role`이 `student`인 사용자만 접근할 수 있다.
- 학생이 배포 문제집을 조회할 때 `students.cohort_id = workbook_assignments.cohort_id`를 검증한다.
- 학생이 문제를 제출할 때 `students.cohort_id = workbook_assignments.cohort_id`를 검증한다.
- 학생은 본인의 `submissions`, `submission_answers`만 조회할 수 있다.
- 강사는 soft delete 되지 않은 기수, 학생, 문제, 문제집, 배포, 성적 정보를 기본 조회 대상으로 한다.
