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

### 강사용 계정 정보 조회

현재 로그인한 강사 본인의 계정 정보를 조회한다. JWT 인증과 `teacher` 역할이 필요하다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/auth/teacher/me` |
| StatusCode | `200`, `401`, `403` |

Response:

```json
{
  "data": {
    "id": "user-uuid",
    "role": "teacher",
    "name": "강사명",
    "loginId": "teacher1",
    "email": "teacher@example.com",
    "teacherId": "teacher-uuid",
    "phone": "010-2000-0001",
    "department": "기본간호학",
    "status": "active",
    "createdAt": "2026-01-05T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### 강사용 계정 정보 수정

현재 로그인한 강사 본인의 일반 계정 정보를 수정한다. 다른 사용자 ID를 요청으로 받아 수정하지 않는다. `role`, `authProvider`, `providerUserId`, `deletedAt` 등 인증·권한 필드는 수정할 수 없다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/auth/teacher/me` |
| StatusCode | `200`, `400`, `401`, `403`, `409` |

Request:

```json
{
  "loginId": "teacher1",
  "name": "강사명",
  "email": "teacher@example.com",
  "phone": "010-2000-0001"
}
```

정책:

- `loginId`, `name`은 필수이다.
- `email`, `phone`은 빈 문자열 또는 공백만 전달하면 `null`로 저장한다.
- `loginId`, `email`은 soft delete되지 않은 다른 사용자와 중복될 수 없다.
- `users`와 `teachers` 갱신은 트랜잭션으로 처리한다.

Response:

```json
{
  "data": {
    "id": "user-uuid",
    "role": "teacher",
    "name": "강사명",
    "loginId": "teacher1",
    "email": "teacher@example.com",
    "teacherId": "teacher-uuid",
    "phone": "010-2000-0001",
    "department": "기본간호학",
    "status": "active",
    "createdAt": "2026-01-05T00:00:00.000Z",
    "updatedAt": "2026-07-02T00:00:00.000Z"
  }
}
```

### 강사용 비밀번호 변경

현재 로그인한 강사 본인의 비밀번호를 변경한다. 평문 비밀번호는 저장하거나 응답하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/auth/teacher/password` |
| StatusCode | `200`, `400`, `401`, `403` |

Request:

```json
{
  "currentPassword": "current-password",
  "nextPassword": "new-password",
  "confirmPassword": "new-password"
}
```

정책:

- 현재 비밀번호가 일치해야 한다.
- 새 비밀번호는 8자 이상이어야 한다.
- 새 비밀번호와 확인 값이 일치해야 한다.
- 새 비밀번호는 현재 비밀번호와 달라야 한다.
- 저장 시 bcrypt hash로 갱신한다.

Response:

```json
{
  "data": {
    "changed": true
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

신규 카카오 계정 Response:

```json
{
  "data": {
    "status": "needs_name",
    "onboardingToken": "limited-student-onboarding-token"
  }
}
```

기존 pending 계정 Response:

```json
{
  "data": {
    "status": "pending",
    "approvalToken": "limited-student-approval-token",
    "student": {
      "id": "student-uuid",
      "name": "학생이 입력한 이름",
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

### 학생 카카오 이름 입력 완료

신규 카카오 학생이 직접 입력한 이름으로 학생 계정을 생성하고 `pending` 승인대기 상태로 전환한다. 카카오 닉네임이나 fallback 이름은 `users.name`에 저장하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/student/kakao/complete-profile` |
| StatusCode | `200`, `400`, `401`, `409` |

Request:

```json
{
  "onboardingToken": "limited-student-onboarding-token",
  "name": "학생이 입력한 이름"
}
```

정책:

- `onboardingToken`은 `tokenUse: "student_onboarding"` 용도의 제한 토큰이다.
- 제한 토큰은 이름 입력 완료 API에서만 사용한다.
- 이름은 앞뒤 공백을 제거하고, 공백만 있는 값은 거부한다.
- 신규 계정 생성 시 `users.name`에는 학생이 입력한 이름만 저장한다.
- 같은 카카오 provider id로 이미 계정이 생성된 경우 중복 생성하지 않고 기존 상태 흐름을 반환한다.
- 응답에는 일반 학생 JWT를 포함하지 않고, pending 학생용 `approvalToken`을 반환한다.

Response:

```json
{
  "data": {
    "status": "pending",
    "approvalToken": "limited-student-approval-token",
    "student": {
      "id": "student-uuid",
      "name": "학생이 입력한 이름",
      "email": "student@example.com",
      "cohortId": null,
      "status": "pending"
    }
  }
}
```

### 학생 카카오 승인 상태 확인

카카오 최초 로그인 후 `pending` 상태인 학생이 승인대기 화면에서 자신의 최신 승인 상태를 확인한다. 일반 학생 JWT가 아니라 카카오 callback에서 받은 제한용 `approvalToken`만 사용한다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/auth/student/approval-status` |
| StatusCode | `200`, `400`, `401` |

Request:

```json
{
  "approvalToken": "limited-student-approval-token"
}
```

정책:

- `approvalToken`은 `tokenUse: "student_approval"` 용도의 제한 토큰이다.
- 제한 토큰은 승인 상태 확인에만 사용하며 문제집, 제출, 성적, 오답 API 접근에는 사용할 수 없다.
- 서버는 토큰의 사용자 식별자와 DB의 최신 학생 상태를 다시 확인한다.
- `pending`이면 승인대기 상태를 유지한다.
- `approved`이고 `cohortId`가 있으면 일반 학생 JWT와 사용자 정보를 발급한다.
- `rejected`, `suspended`이면 일반 학생 JWT를 발급하지 않고 상태만 반환한다.

Pending Response:

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
      "loginId": "kakao:123456",
      "email": "student@example.com",
      "studentId": "student-uuid",
      "cohortId": "cohort-uuid"
    }
  }
}
```

Rejected/Suspended Response:

```json
{
  "data": {
    "status": "rejected",
    "student": {
      "id": "student-uuid",
      "name": "카카오 학생",
      "email": "student@example.com",
      "cohortId": null,
      "status": "rejected"
    }
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


## 관리자 대시보드 요약 조회

관리자 대시보드에서 사용하는 최신 요약 지표, 최근 배포 문제집, 최근 제출 및 성적을 한 번에 조회한다. JWT 인증과 `teacher` 역할이 필요하며 `student` 역할은 `403`을 반환한다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/dashboard` |
| StatusCode | `200`, `401`, `403` |

Query parameters:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `draft \| published \| archived` | 선택. 지정하면 해당 상태의 문제만 기준으로 필터 옵션을 반환한다. 생략하면 삭제되지 않은 전체 문제 기준으로 반환한다. |

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

Query parameters:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `draft \| published \| archived` | 선택. 지정하면 해당 상태의 문제만 기준으로 필터 옵션을 반환한다. 생략하면 삭제되지 않은 전체 문제 기준으로 반환한다. |

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
      "birthDate": "1990-01-01",
      "cohort": {
        "id": "cohort-uuid",
        "name": "2026년 1기"
      },
      "studentNo": "S-0001",
      "status": "approved",
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
  "status": "approved",
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
    "birthDate": "1990-01-01",
    "cohortId": "cohort-uuid",
    "studentNo": "S-0001",
    "status": "approved",
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
    "status": "approved",
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
  "email": "student@example.com",
  "phone": "010-1111-2222",
  "birthDate": "1990-01-01",
  "cohortId": "cohort-uuid",
  "studentNo": "S-0001",
  "status": "suspended",
  "enrolledOn": "2026-03-01",
  "memo": "휴원"
}
```

수정 가능한 필드:

- `name`, `email`, `phone`, `birthDate`, `cohortId`, `studentNo`, `status`, `enrolledOn`, `completedOn`, `memo`
- `loginId`, `authProvider`, `providerUserId`, `role`, `deletedAt`은 일반 학생 수정 API로 변경하지 않는다.
- `cohortId`는 `null`로 보내면 미배정으로 저장할 수 있다.

Response:

```json
{
  "data": {
    "id": "student-uuid",
    "userId": "user-uuid",
    "name": "김학생",
    "loginId": "student01",
    "email": "student@example.com",
    "phone": "010-1111-2222",
    "birthDate": "1990-01-01",
    "cohortId": "cohort-uuid",
    "studentNo": "S-0001",
    "status": "suspended",
    "enrolledOn": "2026-03-01",
    "completedOn": null,
    "memo": "휴원",
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
| `difficulty` | `easy \| medium \| hard` | 난이도. DB/API 호환을 위해 응답에는 남아 있으나 Admin Web에서는 입력·표시·필터로 사용하지 않는다. 신규 Admin 저장 시 서버 기본값은 `medium`이다. |
| `type` | `multiple_choice` | 문제 유형 |
| `content` | string | 문제 본문. 내부 줄바꿈(`\n`)을 보존한다. |
| `choices` | Choice[] | 객관식 선지. 각 선지는 `id`, `text`를 가진다. 기존 조회는 저장된 선지 수를 그대로 반환한다. Admin 신규 생성·수정 저장은 정확히 5개 선지를 요구하며 선지 text의 내부 줄바꿈(`\n`)을 보존한다. |
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

- `subject`, `category` 필터는 모든 공백 문자를 제거한 값으로 정규화한 뒤 문제의 정규화된 `questions.subject`, `questions.category`와 정확히 일치하는 문제만 조회한다.
- `keyword`, `status`, `subject`, `difficulty`, `type`, `page`, `limit`과 함께 조합해 사용할 수 있다. 단, Admin Web 화면에서는 `difficulty` 필터를 제공하지 않는다.

Example: `GET /api/admin/questions?type=multiple_choice&subject=기본간호학&category=활력징후&page=1&limit=20`

Response:

```json
{
  "data": [
    {
      "id": "question-uuid",
      "createdBy": "user-uuid",
      "subject": "기본간호학",
      "category": "활력징후",
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

### 문제 필터 옵션 조회

문제관리 화면과 문제집 편집 화면의 과목/카테고리 필터에 사용할 전체 옵션을 조회한다. 현재 페이지, 검색어, 선택된 과목/카테고리와 무관하게 삭제되지 않은 문제 기준으로 반환한다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/questions/filter-options` |
| StatusCode | `200`, `401`, `403` |

Query parameters:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `status` | `draft \| published \| archived` | 선택. 지정하면 해당 상태의 문제만 기준으로 필터 옵션을 반환한다. 생략하면 삭제되지 않은 전체 문제 기준으로 반환한다. |

Response:

```json
{
  "data": {
    "subjects": ["기초간호학", "보건간호학"],
    "categories": ["감염관리", "활력징후"]
  }
}
```

조회 기준:

- `deleted_at IS NULL` 문제만 기준으로 한다.
- `subject`, `category`는 모든 공백 문자를 제거한 값으로 정규화해 중복 제거한다.
- 정규화 후 `NULL`, 빈 문자열, 공백만 있는 값은 목록에서 제외한다.
- 응답 배열은 한글 가나다순으로 정렬한다.
- `status` query parameter를 생략하면 상태(`draft`, `published`, `archived`)와 무관하게 실제 존재하는 값을 포함한다.
- 문제집 편집 화면의 후보 문제 필터는 `status=published`를 사용해 새 문제집에 추가 가능한 문제 기준의 과목/카테고리만 표시한다.

### 문제 카테고리 목록 조회

문제은행 필터에 사용할 실제 카테고리 목록을 조회한다. 문제 데이터는 수정하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URL | `/api/admin/questions/categories` |
| StatusCode | `200`, `401`, `403` |

Query parameters: 없음

Response:

```json
{
  "data": [
    "기초간호학",
    "보건간호학",
    "공중보건학",
    "실기"
  ]
}
```

조회 기준:

- `deleted_at IS NULL` 문제만 기준으로 한다.
- `category`는 모든 공백 문자를 제거한 값으로 정규화해 중복 제거한다.
- 정규화 후 `NULL`, 빈 문자열, 공백만 있는 문제는 목록에서 제외한다.
- 응답 배열은 한글 가나다순으로 정렬한다.
- 카테고리가 없는 문제는 문제 목록에는 계속 표시되지만, 별도 `미분류` 필터는 제공하지 않는다.

### 문제 생성

`subject`와 `category`는 저장 시 모든 공백 문자(스페이스, 탭, 줄바꿈 등)를 제거한 값으로 정규화한다. `subject`는 필수값이므로 정규화 후 빈 값이면 실패하며, 선택값인 `category`는 정규화 후 빈 값이면 `null`로 저장한다.

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URL | `/api/admin/questions` |
| StatusCode | `201`, `400`, `401`, `403`, `422` |

Request:

Admin Web은 난이도를 입력하거나 전송하지 않는다. `choices`는 정확히 5개여야 하며 빈 선지가 있으면 422를 반환한다.

```json
{
  "subject": "기본간호학",
  "category": "활력징후",
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

`subject`와 `category`는 생성과 동일하게 저장 시 모든 공백 문자를 제거한 값으로 정규화한다. `subject`를 전달한 경우 정규화 후 빈 값이면 실패하며, `category`는 정규화 후 빈 값이면 `null`로 저장한다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/questions/{questionId}` |
| StatusCode | `200`, `400`, `401`, `403`, `404`, `422` |

Request:

`choices`를 함께 수정하는 경우 정확히 5개를 보내야 한다. 기존 4지선다 문제는 조회 가능하지만, Admin Web 수정 저장 시 보기 5를 입력해야 저장할 수 있다.

```json
{
  "content": "다음 중 활력징후에 포함되는 것은?",
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
      "correctAnswerIndex": 0,
    "updatedAt": "2026-06-18T10:00:00+09:00"
  }
}
```

### 문제 상태 일괄 변경

선택한 문제들의 상태를 한 번에 변경한다. 문제 데이터만 갱신하며 문제집, 배포, 제출, 성적, 오답 데이터는 삭제하거나 수정하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/questions/bulk/status` |
| StatusCode | `200`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "questionIds": [
    "question-uuid-1",
    "question-uuid-2",
    "question-uuid-3"
  ],
  "status": "published"
}
```

Response:

```json
{
  "data": {
    "updatedCount": 3,
    "status": "published",
    "questionIds": [
      "question-uuid-1",
      "question-uuid-2",
      "question-uuid-3"
    ]
  }
}
```

검증 규칙:

- `questionIds`는 1개 이상의 UUID 배열이어야 하며 중복 ID는 허용하지 않는다.
- `status`는 `draft`, `published`, `archived` 중 하나여야 한다.
- 존재하지 않거나 삭제된 문제가 하나라도 포함되면 전체 변경을 실패 처리한다.
- `published` 문제만 신규 문제집 문항 선택 대상으로 사용할 수 있다.
- `archived`로 변경해도 기존 문제집에 이미 포함된 문항과 제출·성적 기록은 유지된다.

### 문제 과목 일괄 변경

선택한 문제들의 과목(`subject`)을 한 번에 변경한다. 문제의 과목 필드만 갱신하며 문제집, 배포, 제출, 성적, 오답 데이터는 삭제하거나 수정하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/questions/bulk/subject` |
| StatusCode | `200`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "questionIds": [
    "question-uuid-1",
    "question-uuid-2"
  ],
  "subject": "기초간호학"
}
```

Response:

```json
{
  "data": {
    "updatedCount": 2,
    "subject": "기초간호학",
    "questionIds": [
      "question-uuid-1",
      "question-uuid-2"
    ]
  }
}
```

검증 규칙:

- `questionIds`는 1개 이상의 UUID 배열이어야 하며 중복 ID는 허용하지 않는다.
- 존재하지 않거나 삭제된 문제가 하나라도 포함되면 전체 변경을 실패 처리한다.
- `subject`는 모든 공백 문자를 제거한 값으로 저장한다.
- `subject`는 빈 문자열 또는 공백만 있는 문자열일 수 없다.
- `subject`는 단건 문제 생성·수정과 동일하게 최대 120자까지 허용한다.
- 과목 변경은 문제 상태를 자동으로 변경하지 않으며, 문제집 문항 선택 가능 정책은 기존 `published` 상태 기준을 유지한다.

### 문제 카테고리 일괄 변경

선택한 문제들의 카테고리(`category`)를 한 번에 변경한다. 문제의 카테고리 필드만 갱신하며 문제집, 배포, 제출, 성적, 오답 데이터는 삭제하거나 수정하지 않는다.

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URL | `/api/admin/questions/bulk/category` |
| StatusCode | `200`, `400`, `401`, `403`, `422` |

Request:

```json
{
  "questionIds": [
    "question-uuid-1",
    "question-uuid-2"
  ],
  "category": "기초간호학"
}
```

Response:

```json
{
  "data": {
    "updatedCount": 2,
    "category": "기초간호학",
    "questionIds": [
      "question-uuid-1",
      "question-uuid-2"
    ]
  }
}
```

검증 규칙:

- `questionIds`는 1개 이상의 UUID 배열이어야 하며 중복 ID는 허용하지 않는다.
- 존재하지 않거나 삭제된 문제가 하나라도 포함되면 전체 변경을 실패 처리한다.
- `category`는 모든 공백 문자를 제거한 값으로 저장한다.
- `category`는 빈 문자열 또는 공백만 있는 문자열일 수 없다.
- `category`는 단건 문제 생성·수정과 동일하게 최대 120자까지 허용한다.
- 카테고리 변경은 문제 상태를 자동으로 변경하지 않으며, 문제집 문항 선택 가능 정책은 기존 `published` 상태 기준을 유지한다.

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
백엔드는 Poppler `pdftotext -bbox-layout`로 페이지별 단어 좌표를 추출하고, 다단 레이아웃은 열 수 후보를 비교해 좌측 열 전체 → 우측 열 전체 순서로 재구성한 뒤 문항을 파싱한다.

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
| `useAiAssist` | boolean | 선택. `true`이면 Backend에서 AI 보정을 수행한다. 기본값은 `false` |
| `aiAssistMode` | string | 선택. `all` 또는 `review_only`. `useAiAssist=true`일 때만 사용하며 기본값은 `all` |

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
      "invalid": 0,
      "parseWarnings": []
    }
  }
}
```

미리보기 상태:

- `ready`: 본문, 보기 5개, 정답 1~5번 매칭이 완료된 문항
- `needs_review`: 그림·도표·자료형 문항 또는 보기 개수가 5개가 아니어서 강사 검토·수정이 필요한 문항
- `invalid`: 본문, 보기, 정답이 누락되었거나 정답 번호가 보기 범위를 벗어난 문항. 깨진 문자(`�`, `□` 등) 또는 비정상적으로 짧은 본문도 `ready`가 될 수 없다.

문항/정답 파싱 규칙:

- 문항 시작: `1.`, `1)`, `문제 1.` 형식을 지원하며, 줄 시작뿐 아니라 같은 텍스트 블록 중간에 붙은 다음 문항 번호도 marker로 분리한다.
- 보기: `①~⑤`, `1)~5)`, `1.~5.` 형식을 지원한다.
- 한 줄에 여러 보기가 붙어 있거나 보기 문장이 다음 줄로 이어져도 다음 보기 marker 또는 다음 문제 번호 전까지 같은 보기로 누적한다.
- 문제 본문은 첫 보기 marker 전까지의 텍스트를 이어 붙이고 문항 번호는 본문에 포함하지 않는다.
- 여러 페이지와 여러 텍스트 스트림을 페이지 순서대로 분석한다.
- 다단 레이아웃은 좌표를 기준으로 행을 구성한 뒤 1~4열 후보 중 문항 marker가 가장 안정적인 열 구성을 선택한다.
- 정답지는 `교시`, `과목`, `문제번호`, `최종답안`이 함께 있는 행 또는 전체 텍스트의 번호-정답 패턴에서 문제번호별 과목과 답안 `1~5`를 수집한다.
- 정답지에서 과목 셀이 병합되어 다음 행에 문제번호와 답안만 이어지는 경우, 직전에 추출한 과목을 같은 문제번호 매핑에 사용한다.
- 문제번호 기준 과목 매핑에 실패하거나 정답표에 과목 정보가 없으면 `PDF 가져오기`를 fallback으로 표시한다.
- 전체 문서가 하나의 문항으로 합쳐진 것으로 판단되면 문항 경계 실패로 처리한다.
- `summary.parseWarnings`에는 문제번호 누락/중복 가능성, 정답표에는 있으나 문제지에서 찾지 못한 번호, AI 보정 경고 등 전체 파싱 경고를 포함할 수 있다.

AI 보정 옵션:

- AI 보정은 선택 기능이며, 사용하지 않으면 기존 Poppler 기반 파싱만 수행한다.
- AI 보정을 사용하지 않을 때 기본 파서가 0문항을 찾으면 기존처럼 `PDF_QUESTION_PARSE_FAILED`를 반환한다.
- AI 보정을 사용할 때 기본 파서가 0문항을 찾더라도 문제지 raw text가 추출되어 있으면 즉시 실패하지 않고 raw text, 정답지 text, 정답 map, parser warning을 AI 보정 단계로 전달한다.
- AI 보정을 사용해도 결과는 즉시 DB에 저장되지 않고 미리보기로만 반환된다. 강사가 미리보기에서 검토·수정·선택한 뒤 확정 생성 API를 호출해야 `draft` 문제가 생성된다.
- `aiAssistMode=all`: 전체 문항을 AI 보정 대상으로 전달한다.
- `aiAssistMode=review_only`: 기존 파서가 `ready`로 판단한 문항은 유지하고, `needs_review` 또는 `invalid` 문항만 AI 보정 대상으로 전달한다.
- AI는 문제지/정답지 추출 텍스트와 기존 파싱 결과 안에서만 보정해야 하며, 원문에 없는 문제·보기·정답을 새로 만들면 안 된다.
- OpenAI API Key와 모델 설정은 Backend 환경변수로만 관리하며 Admin Web이나 Student App에 노출하지 않는다.

주요 오류 코드:

- `PDF_TEXT_EXTRACTOR_NOT_INSTALLED`: 서버 런타임에 Poppler `pdftotext`가 설치되어 있지 않다.
- `PDF_TEXT_EXTRACTION_FAILED`: PDF 텍스트 추출에 실패했다.
- `PDF_QUESTION_PARSE_FAILED`: 문제지에서 문항을 찾지 못했다.
- `PDF_QUESTION_BOUNDARY_FAILED`: 문항 경계를 안정적으로 분리하지 못했다.
- `PDF_IMPORT_AI_API_KEY_REQUIRED`: AI 보정을 요청했지만 Backend에 `OPENAI_API_KEY`가 설정되어 있지 않다. AI 보정을 사용하지 않는 일반 PDF import에는 영향을 주지 않는다.
- `PDF_IMPORT_AI_REQUEST_FAILED`: AI 보정 요청이 실패했다.
- `PDF_IMPORT_AI_RESPONSE_EMPTY`: AI 보정 응답이 비어 있다.
- `PDF_IMPORT_AI_RESPONSE_INVALID`: AI 보정 결과에서 유효한 문항을 찾지 못했다.

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

- 기본 정렬은 문제집 제목의 앞뒤 공백을 제외한 가나다순 오름차순이다.
- 제목이 같은 경우 `createdAt`, `id` 오름차순을 보조 기준으로 사용해 페이지네이션 순서를 안정적으로 유지한다.

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

### 강사용 제출 기록 삭제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| URL | `/api/admin/submissions/{submissionId}` |
| StatusCode | `200`, `401`, `403`, `404` |

관리자가 특정 제출 기록을 삭제한다. 실제 레코드는 hard delete하지 않고 `submissions`와 관련 `submission_answers`를 soft delete 처리한다. 삭제된 제출은 성적 목록, 평균 점수, 평균 정답률, 문항별 오답률 집계와 학생 재제출 횟수 계산에서 제외된다.

Response:

```json
{
  "success": true
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
