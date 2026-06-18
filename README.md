# Sejong Application

간호학원 문제집 관리 시스템입니다. 강사는 웹에서 문제집을 만들고 기수별로 배포하며, 학생은 앱에서 배포된 문제집을 풀고 결과를 확인합니다.

## 현재 상태

- 강사용 웹은 React + TypeScript + Vite 기반으로 초기 화면 골격과 mock data 화면 일부가 구성되어 있습니다.
- 학생용 앱과 백엔드는 협업을 위한 폴더만 준비되어 있으며 기능 구현은 아직 없습니다.
- 기획, UI, ERD, API, 협업 규칙은 `docs` 폴더에서 관리합니다.

## 실행 방법

강사용 웹 현재 개발 골격은 루트 Vite 프로젝트로 실행합니다.

```bash
npm install
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

빌드 확인:

```bash
npm run build
```

## 역할 분담

| 영역 | 폴더 | 담당 범위 |
| --- | --- | --- |
| 강사용 웹 | `/admin-web` 또는 현재 루트 `src` | Dashboard, 기수관리, 학생관리, 문제관리, 문제집관리, 성적분석 |
| 학생용 앱 | `/student-app` | 학생 로그인, 문제집 목록, 문제 풀이, 결과 확인 |
| 백엔드 | `/backend` | API, 인증, DB, 비즈니스 로직 |
| 공통 타입 | `/packages/types` | 웹, 앱, 백엔드가 공유하는 TypeScript 타입 |
| 문서 | `/docs` | PRD, UI, ERD, API, WBS, 협업 규칙 |

## 폴더 구조

```text
.
  backend/
  docs/
  packages/
    types/
  student-app/
  src/
  package.json
```

현재 `src`는 강사용 웹 초기 골격입니다. 프로젝트가 커지면 `admin-web` 폴더로 분리하는 것을 기준으로 합니다.

## 브랜치 규칙

- `main` 브랜치에 직접 커밋하지 않습니다.
- 기능 작업은 `feature/{area}-{short-description}` 형식을 사용합니다.
- 버그 수정은 `fix/{area}-{short-description}` 형식을 사용합니다.
- 문서 작업은 `docs/{short-description}` 형식을 사용합니다.
- 작업 완료 후 PR을 만들고 리뷰 후 merge합니다.

예시:

```text
feature/admin-dashboard
feature/backend-auth
fix/student-login
docs/git-rules
```

## 주요 문서

- `docs/PRD.md`: 제품 요구사항
- `docs/UI.md`: 화면 구조
- `docs/ERD.md`: DB 설계
- `docs/API.md`: API 설계
- `docs/WBS.md`: 작업 분해
- `docs/DEVELOPMENT_RULES.md`: 개발 협업 규칙
- `docs/CODEX_RULES.md`: Codex 작업 규칙
- `docs/GIT_RULES.md`: Git 협업 규칙
