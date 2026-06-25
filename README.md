# Sejong Application

간호학원 문제집 관리 시스템입니다. 강사는 웹에서 기수, 학생, 문제, 문제집, 배포, 성적을 관리하고, 학생은 웹/앱 화면에서 배포된 문제집을 풀이한 뒤 결과와 오답을 확인합니다.

2026년 7월 2일부터 학원 MVP 베타 테스트를 시작할 예정입니다. 이 문서는 베타 전 실행, 배포, 계정, 테스트 시나리오, 알려진 제한사항, 실사용 전 체크리스트를 한곳에서 확인하기 위한 운영 가이드입니다.

## 현재 구현 상태

| 영역 | 폴더 | 현재 상태 |
| --- | --- | --- |
| 강사용 웹 | `admin-web` | React + TypeScript + Vite 기반. 로그인, 대시보드, 기수/학생/문제/문제집/배포/성적/설정 화면을 제공합니다. |
| 학생용 앱 | `student-app` | Expo + React Native 기반. 학생 로그인, 기수 선택, 문제집 목록/상세, 풀이, 제출, 결과, 오답정리, 내 정보 흐름을 제공합니다. Vercel 웹 배포용 Vite 빌드도 지원합니다. |
| 백엔드 | `backend` | NestJS + PostgreSQL 기반. 인증, 관리자 API, 학생 과제/제출/점수 API, Health Check를 제공합니다. |
| 공통 타입 | `packages/types` | 웹/앱/백엔드가 공유할 수 있는 TypeScript 타입 영역입니다. |
| 문서 | `docs` | PRD, API, DB, 배포, 시드 데이터, 협업 규칙 문서를 보관합니다. |

## 폴더 구조

```text
.
├── admin-web/       # 강사용 웹
├── student-app/     # 학생용 앱 및 Vercel 웹 빌드
├── backend/         # NestJS API 서버
├── packages/types/  # 공통 타입
├── docs/            # 기획/설계/배포/운영 문서
└── package.json     # 루트 스크립트
```

## 로컬 실행 방법

### Backend

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

로컬 `.env`에는 실제 개발용 값을 넣되, `DATABASE_URL`, `JWT_SECRET` 같은 비밀값은 문서, 이슈, PR, 스크린샷에 남기지 않습니다.

### Admin Web

루트에서 실행:

```bash
npm install --prefix admin-web
npm run dev
```

또는 `admin-web` 폴더에서 실행:

```bash
cd admin-web
npm install
npm run dev
```

기본 주소:

```text
http://localhost:5173
```

Admin Web은 `VITE_API_BASE_URL`로 Backend 주소를 바라봅니다. 값을 지정하지 않으면 로컬 기본값 `http://localhost:3000`을 사용합니다. Admin Web은 Supabase를 직접 사용하지 않으므로 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정하지 않습니다.

### Student App

```bash
cd student-app
npm install
npm run start
```

터미널 안내에 따라 Android, iOS, Web 중 원하는 환경으로 실행합니다. Vercel 웹 배포용 정적 빌드는 다음 명령으로 확인합니다.

```bash
npm run build
```

Student App의 배포/로컬 웹 실행 환경변수는 `VITE_API_BASE_URL`만 사용합니다. 값을 지정하지 않으면 기본 Backend URL을 사용합니다. Student App도 Supabase를 직접 사용하지 않으므로 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 설정하지 않습니다.

## 배포 구조

| 구성요소 | 배포 대상 | 주요 설정 |
| --- | --- | --- |
| Admin Web | Vercel | Root Directory: `admin-web`, Build Command: `npm run build`, Output Directory: `dist` |
| Student App Web | Vercel | Root Directory: `student-app`, Build Command: `npm run build`, Output Directory: `dist` |
| Backend API | Railway | Root Directory: `backend`, Build Command: `npm ci && npm run build`, Start Command: `npm run start` |
| Database | Supabase PostgreSQL | `backend/database/schema.sql` 적용 후 베타용 seed 또는 운영 준비 데이터를 반영 |

## 환경변수 요약

| 영역 | 필요한 환경변수 | 설명 |
| --- | --- | --- |
| Admin Web | `VITE_API_BASE_URL` | Railway Backend API Origin |
| Student App Web | `VITE_API_BASE_URL` | Railway Backend API Origin |
| Backend | `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL_SECONDS`, `CORS_ORIGIN` | Supabase PostgreSQL 연결, JWT, CORS 설정 |

- 프론트엔드는 Supabase를 직접 사용하지 않고 Backend API만 호출합니다.
- Supabase 연결은 Backend의 `DATABASE_URL`로만 처리합니다.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`는 현재 사용하지 않습니다.
- 실제 `DATABASE_URL`, `JWT_SECRET`, 데이터베이스 비밀번호는 문서에 쓰지 않습니다.

### Vercel

- Admin Web과 Student App은 각각 Vercel 프로젝트로 배포합니다.
- 두 프론트엔드 모두 Backend Railway HTTPS 주소를 API Base URL로 사용합니다.
- Admin Web은 React Router 직접 접속을 위해 `admin-web/vercel.json`에서 모든 경로를 `/index.html`로 rewrite합니다.
- Student App Web은 Vite 빌드 결과물인 `student-app/dist`를 배포합니다.

### Railway

- Backend는 Railway에서 `PORT`를 주입받아 실행합니다.
- Railway Variables에는 `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, JWT TTL, `CORS_ORIGIN`을 설정합니다.
- `CORS_ORIGIN`에는 Admin Web과 Student App의 Vercel Origin을 쉼표로 연결합니다.
- 실제 `DATABASE_URL`, `JWT_SECRET`, 데이터베이스 비밀번호는 문서에 쓰지 않습니다.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`는 현재 Backend에서 사용하지 않습니다.

### Supabase

- Supabase PostgreSQL에 `backend/database/schema.sql`을 먼저 적용합니다.
- 베타 테스트 전에 테스트 계정, 기수, 문제, 문제집, 배포 데이터가 준비되어야 합니다.
- 운영 전에는 테스트 계정 비밀번호를 반드시 변경하거나 비활성화해야 합니다.

## 베타 테스트 계정

2026년 7월 2일 베타 테스트에서 사용할 계정입니다. 실제 운영 전에는 아래 비밀번호를 반드시 변경해야 합니다.

| 역할 | Login ID | Password |
| --- | --- | --- |
| 강사 | `teacher1` | `teacher-1234` |
| 학생 | `student01` ~ `student10` | `student-1234` |

계정 점검 기준:

- `teacher1`은 Admin Web 로그인과 관리자 화면 접근이 가능해야 합니다.
- `student01`부터 `student10`까지 Student App 로그인이 가능해야 합니다.
- 각 학생은 베타 테스트 대상 기수에 연결되어 있어야 합니다.
- 대상 기수에는 최소 1개 이상의 공개된 문제집 배포가 있어야 합니다.

## 2026년 7월 2일 베타 테스트 시나리오

### 강사용 흐름

1. Admin Web 배포 URL에 접속합니다.
2. `teacher1 / teacher-1234`로 로그인합니다.
3. 대시보드에서 전체 학생, 문제집, 최근 제출 현황이 보이는지 확인합니다.
4. 기수 관리에서 베타 테스트 대상 기수가 보이는지 확인합니다.
5. 학생 관리에서 `student01` ~ `student10` 계정과 기수 연결 상태를 확인합니다.
6. 문제 관리에서 객관식 문제 목록과 보기/정답/해설이 표시되는지 확인합니다.
7. 문제집 관리에서 베타용 문제집의 문항 구성과 배점이 맞는지 확인합니다.
8. 문제집 배포 관리에서 베타 기수에 문제집이 공개 상태로 배포되어 있는지 확인합니다.
9. 학생이 제출한 뒤 성적 화면에서 점수, 정답률, 제출 이력이 갱신되는지 확인합니다.
10. 테스트 종료 후 임시 계정 비밀번호 변경 또는 비활성화 계획을 확정합니다.

### 학생용 흐름

1. Student App 또는 Student Web 배포 URL에 접속합니다.
2. `student01 / student-1234`로 로그인합니다.
3. 기수 선택 화면에서 본인 기수를 선택합니다.
4. 문제집 목록에서 베타용 문제집이 보이는지 확인합니다.
5. 문제집 상세 화면에서 문항 수, 상태, 시작 버튼을 확인합니다.
6. 문제 풀이 화면에서 보기를 선택하고 이전/다음 이동을 확인합니다.
7. 풀이 중 화면을 이탈했다가 이어하기가 가능한지 확인합니다.
8. 마지막 문항까지 풀이한 뒤 제출합니다.
9. 결과 화면에서 점수, 정답/오답, 해설이 표시되는지 확인합니다.
10. 오답정리와 내 정보 화면에서 제출 이력과 성적 요약을 확인합니다.

## 알려진 제한사항

- 현재 베타는 MVP 검증용이며, 실제 학원 운영을 위한 모든 관리자 권한/감사 로그/통계 기능이 완성된 상태는 아닙니다.
- 테스트 계정은 공용 베타 계정이므로 운영 전 비밀번호 변경 또는 비활성화가 필요합니다.
- Student App의 로컬 저장 상태는 브라우저 또는 앱 실행 환경에 따라 남아 있을 수 있으므로, 반복 테스트 전 로그아웃 또는 저장소 초기화가 필요할 수 있습니다.
- Supabase 데이터는 베타 중 여러 사용자가 동시에 제출하면 점수와 제출 이력이 계속 누적됩니다.
- Vercel과 Railway 환경변수 변경 후에는 각 서비스를 재배포해야 최신 설정이 반영됩니다.
- 브라우저 CORS 문제는 Railway `CORS_ORIGIN`에 배포 Origin이 정확히 들어가 있는지 먼저 확인합니다.
- 실제 운영 전 개인정보, 계정, 성적 데이터 처리 기준을 별도로 확정해야 합니다.

## 7월 2일 전 체크리스트

### 배포 전

- [ ] Backend Railway 배포가 `main` 최신 커밋 기준인지 확인합니다.
- [ ] Admin Web Vercel 배포가 `main` 최신 커밋 기준인지 확인합니다.
- [ ] Student App Vercel 배포가 `main` 최신 커밋 기준인지 확인합니다.
- [ ] Railway `/api/health`가 HTTP 200을 반환하는지 확인합니다.
- [ ] Admin Web의 `VITE_API_BASE_URL`이 Railway Backend HTTPS Origin을 가리키는지 확인합니다.
- [ ] Student App의 `VITE_API_BASE_URL`이 Railway Backend HTTPS Origin을 가리키는지 확인합니다.
- [ ] Railway `CORS_ORIGIN`에 Admin Web과 Student App의 Vercel Origin이 모두 포함되어 있는지 확인합니다.
- [ ] Supabase schema와 베타용 데이터가 적용되어 있는지 확인합니다.

### 계정/데이터

- [ ] `teacher1 / teacher-1234` 로그인이 가능한지 확인합니다.
- [ ] `student01` ~ `student10 / student-1234` 로그인이 가능한지 확인합니다.
- [ ] 모든 학생이 베타 테스트 대상 기수에 연결되어 있는지 확인합니다.
- [ ] 베타용 문제집이 대상 기수에 공개 상태로 배포되어 있는지 확인합니다.
- [ ] 문제별 보기, 정답, 해설, 배점이 베타 테스트용으로 맞는지 확인합니다.
- [ ] 실제 운영 전 테스트 계정 비밀번호 변경 또는 비활성화 일정을 정합니다.

### 현장 테스트

- [ ] 강사용 로그인, 대시보드, 기수/학생/문제/문제집/배포/성적 화면을 한 번씩 확인합니다.
- [ ] 학생용 로그인, 문제집 선택, 풀이, 제출, 결과, 오답정리, 내 정보 흐름을 한 번씩 확인합니다.
- [ ] `/login`, `/admin/dashboard` 같은 Admin Web 직접 접속 URL이 Vercel에서 404 없이 열리는지 확인합니다.
- [ ] Student App Web에서 흰 화면 없이 첫 화면이 렌더링되는지 확인합니다.
- [ ] Chrome 또는 Safari 개발자 도구 Console에 배포 차단 수준의 오류가 없는지 확인합니다.
- [ ] 테스트 중 발견한 이슈를 기능 문제, 데이터 문제, 배포 설정 문제로 나누어 기록합니다.

## 주요 문서

- `docs/PRD.md`: 제품 요구사항
- `docs/UI.md`: 화면 구조
- `docs/ERD.md`: DB 설계
- `docs/DB_SCHEMA.md`: DB 스키마 설명
- `docs/API.md`: API 설계
- `docs/DEPLOYMENT.md`: Railway Backend 배포 가이드
- `docs/SEED_DATA.md`: 시드 데이터 설명
- `docs/WBS.md`: 작업 분해
- `docs/DEVELOPMENT_RULES.md`: 개발 협업 규칙
- `docs/CODEX_RULES.md`: Codex 작업 규칙
- `docs/GIT_RULES.md`: Git 협업 규칙
