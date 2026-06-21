# Backend Setup

## 목적

`backend` 폴더는 강사용 웹과 학생 앱이 공통으로 사용할 API 서버다. 현재 단계에서는 실제 도메인 API를 구현하지 않고, NestJS 서버 실행 구조와 PostgreSQL/Supabase 연결 준비만 구성한다.

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

현재 제공하는 API는 Health Check 하나다.

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
- 실제 로그인, 기수, 학생, 문제, 문제집, 제출, 성적 API는 아직 구현하지 않음

## 다음 작업

1. 인증 모듈 생성
2. 공통 응답/에러 포맷 정의
3. `docs/API.md` 기준으로 도메인 모듈 분리
4. DB migration 도구 도입 검토
