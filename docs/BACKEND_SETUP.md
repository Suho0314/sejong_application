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

| 이름 | 필수 여부 | 설명 |
| --- | --- | --- |
| `NODE_ENV` | 운영 환경 필수 | 실행 환경. Railway에서는 `production` 사용 |
| `PORT` | 선택 | API 서버 포트. 기본값 `3000`, Railway가 자동 제공 |
| `DATABASE_URL` | 필수 | PostgreSQL 또는 Supabase PostgreSQL 연결 문자열 |
| `JWT_SECRET` | 필수 | JWT 서명용 긴 임의 문자열 |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | 선택 | access token 유효시간(초, 기본값 `3600`) |
| `CORS_ORIGIN` | 운영 브라우저 클라이언트 필수 | 쉼표로 구분한 허용 Origin 목록 |

## PostgreSQL 연결

로컬 PostgreSQL 예시:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sejong_application
```

Supabase PostgreSQL 예시:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

`DatabaseModule`은 `DATABASE_URL`을 읽어 `pg.Pool`을 생성한다. 연결 문자열에 `supabase.co`가 포함되면 SSL 옵션을 켠다.
현재 Backend는 PostgreSQL에 직접 연결하므로 Supabase 클라이언트용 `SUPABASE_URL`, `SUPABASE_ANON_KEY`는 사용하지 않는다. Frontend도 Supabase를 직접 호출하지 않고 Backend API만 호출한다.

실제 `DATABASE_URL`과 `JWT_SECRET`은 로컬 `.env` 또는 배포 플랫폼의 Secret 저장소에만 보관한다.
프론트엔드 번들, GitHub, 문서에는 실제 값을 넣지 않는다.

## 서버 바인딩과 CORS

서버는 `PORT`를 읽고 `0.0.0.0`에서 요청을 받는다. 따라서 로컬 개발과 Railway의 동적 포트 환경을 모두 지원한다.

`CORS_ORIGIN`에는 브라우저에서 접근할 정확한 Origin을 쉼표로 구분해 입력한다. 개발 환경에서는 Admin Web과 Expo Web 테스트를 위해 `localhost` 및 `127.0.0.1`의 `5173`, `8081`, `19006` 포트가 추가로 허용된다.

운영 환경에서는 `CORS_ORIGIN`에 명시된 Origin만 허용한다. 변수를 설정하지 않으면 브라우저의 교차 출처 요청은 허용되지 않지만, `curl`, 서버 간 통신, Railway Health Check처럼 `Origin` 헤더가 없는 요청은 계속 처리한다. 와일드카드 `*`는 서버 시작 단계에서 거부한다. 인증에 필요한 `Authorization`과 `Content-Type` 헤더는 허용한다.

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

응답에는 DB URL, JWT Secret 또는 내부 환경 설정이 포함되지 않는다.

## Railway 배포

GitHub 저장소 연결, Railway 서비스 설정, 운영 환경 변수, Supabase 연결 주의사항,
공개 도메인 생성 및 배포 후 Health Check 절차는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고한다.

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
