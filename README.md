# Sejong Application

간호학원 문제집 관리 시스템입니다. 강사는 웹에서 문제집을 만들고 기수별로 배포하며, 학생은 앱에서 배포된 문제집을 풀이하고 결과를 확인합니다.

## 폴더 구조

```text
.
├── admin-web/       # 강사용 웹, React + TypeScript + Vite
├── student-app/     # 학생용 앱, 추후 React Native 기반으로 구현
├── backend/         # 백엔드, 추후 Node.js + TypeScript 기반으로 구현
├── packages/
│   └── types/       # 웹/앱/백엔드 공통 타입
├── docs/            # PRD, UI, ERD, API, WBS, 협업 문서
├── package.json     # 루트 실행 스크립트
└── .env.example     # 공통 환경 변수 예시
```

## 실행 방법

루트에서 강사용 웹을 실행할 수 있습니다.

```bash
npm install --prefix admin-web
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

강사용 웹 폴더에서 직접 실행할 수도 있습니다.

```bash
cd admin-web
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
```

## 영역별 역할

| 영역 | 폴더 | 역할 |
| --- | --- | --- |
| 강사용 웹 | `admin-web` | Dashboard, 기수관리, 학생관리, 문제관리, 문제집관리, 성적분석 |
| 학생용 앱 | `student-app` | 학생 로그인, 문제집 목록, 문제 풀이, 결과 확인 |
| 백엔드 | `backend` | 인증, API, DB, 비즈니스 로직 |
| 공통 타입 | `packages/types` | 웹/앱/백엔드가 공유하는 TypeScript 타입 |
| 문서 | `docs` | 기획, UI, ERD, API, 협업 규칙 |

## 브랜치 규칙

- `main` 브랜치에 직접 커밋하지 않습니다.
- 기능 작업은 `feature/{area}-{short-description}` 형식을 사용합니다.
- 버그 수정은 `fix/{area}-{short-description}` 형식을 사용합니다.
- 문서 작업은 `docs/{short-description}` 형식을 사용합니다.
- 설정 작업은 `chore/{short-description}` 형식을 사용합니다.
- 작업 완료 후 PR을 만들고 리뷰 후 merge합니다.

예시:

```text
feature/admin-dashboard
feature/student-workbook-list
feature/backend-auth
docs/git-rules
chore/monorepo-structure
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
