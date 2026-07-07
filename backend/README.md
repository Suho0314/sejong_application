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

## CORS 설정

Backend는 `CORS_ORIGIN` 환경변수를 쉼표로 분리해 여러 Origin을 허용합니다.
Railway에는 Admin Web과 Student App의 Vercel 배포 Origin을 함께 등록합니다.

```bash
CORS_ORIGIN=https://your-admin-web.vercel.app,https://your-student-app.vercel.app
```

로컬 개발 Origin은 서버에서 기본 허용합니다.

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:8081
http://127.0.0.1:8081
http://localhost:19006
http://127.0.0.1:19006
```

`CORS_ORIGIN`에는 `*`를 넣지 말고, 브라우저 주소창에 표시되는 정확한 Origin만
쉼표로 연결합니다. 값 변경 후에는 Railway 서비스가 새 환경변수로 재배포되어야
합니다.

## 작업 규칙

- `backend` 작업 중에는 `admin-web` 또는 `student-app`을 수정하지 않습니다.
- API 구조는 `docs/API.md`를 기준으로 합니다.
- DB 구조는 `docs/DB_SCHEMA.md`와 `backend/database/schema.sql`을 기준으로 합니다.
- 환경 변수 예시는 `backend/.env.example`을 기준으로 합니다.

## 현재 상태

- NestJS 서버 초기 구조가 준비되어 있습니다.
- `GET /api/health`만 제공합니다.
- 실제 도메인 API는 아직 구현하지 않았습니다.
