# Backend

NestJS 기반 API 서버 영역입니다.

## 역할

- 인증 API
- 강사용 API
- 학생 앱 API
- PostgreSQL/Supabase 연동
- 성적 계산 및 제출 처리

## 기술 스택

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Supabase PostgreSQL 연결 준비

## 실행

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Health Check:

```bash
curl http://localhost:3000/api/health
```

## 작업 규칙

- `backend` 작업 중에는 `admin-web` 또는 `student-app`을 수정하지 않습니다.
- API 구조는 `docs/API.md`를 기준으로 합니다.
- DB 구조는 `docs/DB_SCHEMA.md`와 `backend/database/schema.sql`을 기준으로 합니다.
- 환경 변수 예시는 `backend/.env.example`을 기준으로 합니다.

## 현재 상태

- NestJS 서버 초기 구조가 준비되어 있습니다.
- `GET /api/health`만 제공합니다.
- 실제 도메인 API는 아직 구현하지 않았습니다.
