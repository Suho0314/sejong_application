# Backend Setup

## 목적

`backend` 폴더는 강사용 웹과 학생 앱이 공통으로 사용할 NestJS API 서버다. PostgreSQL 연결, Health Check, 강사·학생 로그인과 JWT access token 발급을 제공한다.

## 생성 구조

```text
backend/
  .env.example
  nest-cli.json
  package.json
  tsconfig.json
  tsconfig.build.json
  database/
    schema.sql
    seed.sql
  src/
    app.module.ts
    main.ts
    database/
      database.constants.ts
      database.module.ts
      database.service.ts
    auth/
      dto/login.dto.ts
      auth.controller.ts
      auth.module.ts
      auth.service.ts
      auth.types.ts
    health/
      health.controller.ts
      health.module.ts
      health.service.ts
```

## 기술 스택

- NestJS
- TypeScript
- PostgreSQL
- Supabase PostgreSQL
- `pg` connection pool
- `bcrypt` 비밀번호 해시 검증
- JWT access token

## 환경 변수

`backend/.env.example`을 복사해서 `backend/.env`를 만든다.

```bash
cd backend
cp .env.example .env
```

필수 환경 변수:

| 이름 | 설명 |
| --- | --- |
| `NODE_ENV` | 실행 환경 |
| `PORT` | API 서버 포트 |
| `DATABASE_URL` | PostgreSQL 또는 Supabase PostgreSQL 연결 문자열 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase 클라이언트용 anon key |
| `JWT_SECRET` | JWT 서명용 secret |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | access token 유효시간(초, 기본값 `3600`) |

## PostgreSQL 연결

로컬 PostgreSQL 예시:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sejong_application
```

Supabase PostgreSQL 예시:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
```

`DatabaseModule`은 `DATABASE_URL`을 읽어 `pg.Pool`을 생성한다. 연결 문자열에 `supabase.co`가 포함되면 SSL 옵션을 켠다.

## 실행 방법

```bash
cd backend
npm install
npm run start:dev
```

서버 기본 주소:

```text
http://localhost:3000
```

전역 API prefix:

```text
/api
```

## Health Check

| Method | URL | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | API 서버 동작 확인 |

예상 응답:

```json
{
  "status": "ok",
  "service": "sejong-backend",
  "timestamp": "2026-06-21T00:00:00.000Z"
}
```

## Auth API

| Method | URL | 허용 role |
| --- | --- | --- |
| `POST` | `/api/auth/teacher/login` | `teacher` |
| `POST` | `/api/auth/student/login` | `student` |

두 API 모두 `loginId` 또는 `email`과 `password`를 받는다. `users.password_hash`는 bcrypt 해시여야 하며, 사용자 및 역할별 프로필의 `deleted_at`이 `NULL`인 계정만 로그인할 수 있다.

강사 로그인 예시:

```bash
curl -i -X POST http://localhost:3000/api/auth/teacher/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"teacher1","password":"teacher-password"}'
```

학생 로그인 예시:

```bash
curl -i -X POST http://localhost:3000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"loginId":"student1","password":"student-password"}'
```

성공 시 응답의 `data.accessToken`에 JWT가 반환된다. 잘못된 비밀번호, 다른 role, 삭제·비활성 계정은 계정 존재 여부를 노출하지 않고 `401 Unauthorized`를 반환한다.

### 테스트 계정 비밀번호 준비

`database/seed.sql`의 `$seed$...` 값은 예시 자리표시자이며 bcrypt 해시가 아니다. 로컬 테스트 전 PostgreSQL `pgcrypto`로 테스트 계정의 bcrypt 해시를 설정할 수 있다.

```sql
UPDATE users
SET password_hash = crypt('teacher-password', gen_salt('bf'))
WHERE login_id = 'teacher1';

UPDATE users
SET password_hash = crypt('student-password', gen_salt('bf'))
WHERE login_id = 'student1';
```

운영 비밀번호를 SQL이나 저장소에 평문으로 저장하지 않는다.

## DB 스키마 적용

```bash
psql "$DATABASE_URL" -f backend/database/schema.sql
psql "$DATABASE_URL" -f backend/database/seed.sql
```

## 현재 구현 범위

- NestJS 프로젝트 구조 생성
- `DATABASE_URL` 기반 DB 연결 준비
- Supabase PostgreSQL SSL 연결 준비
- `GET /api/health` 추가
- `POST /api/auth/teacher/login` 추가
- `POST /api/auth/student/login` 추가
- bcrypt 비밀번호 검증과 JWT access token 발급
- 기수, 학생, 문제, 문제집, 제출, 성적 API는 아직 구현하지 않음

## 다음 작업

1. refresh token 재발급·로그아웃 구현
2. JWT 인증 Guard와 role Guard 구현
3. `docs/API.md` 기준으로 도메인 모듈 분리
4. DB migration 도구 도입 검토
