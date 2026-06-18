# Development Rules

## 목적

이 문서는 간호학원 문제집 관리 시스템의 협업 및 개발 기준을 정의한다. 모든 개발자는 기능 구현 전에 `docs/PRD.md`, `docs/UI.md`, `docs/ERD.md`, `docs/API.md`를 함께 확인한다.

## 프로젝트 구조

향후 프로젝트는 다음 구조를 기준으로 분리한다.

| 경로 | 역할 |
| --- | --- |
| `/admin-web` | 강사용 웹 |
| `/student-app` | 학생용 앱 |
| `/backend` | 백엔드 |
| `/packages/types` | 웹, 앱, 백엔드 공통 TypeScript 타입 |
| `/docs` | 기획, UI, ERD, API, 협업 규칙 문서 |

현재 초기 개발 단계에서는 React + Vite 기반 강사용 웹 골격이 루트 `src`에 존재할 수 있다. 프로젝트가 확장되면 `/admin-web`로 이동하는 것을 기준으로 한다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Web | React + TypeScript + Vite |
| App | React Native + TypeScript |
| Backend | Node.js 기반 NestJS 또는 Express + TypeScript |
| DB | PostgreSQL |

## 환경 변수

- 로컬 환경 변수 예시는 루트 `.env.example`을 기준으로 한다.
- 실제 `.env` 파일은 git에 커밋하지 않는다.
- 비밀키, DB 비밀번호, 토큰 값은 문서나 코드에 직접 작성하지 않는다.
- 환경 변수 추가가 필요하면 `.env.example`도 함께 업데이트한다.

## 용어 통일

문서, 코드, API, DB에서 다음 용어를 일관되게 사용한다.

| 한국어 | 영문 |
| --- | --- |
| 기수 | cohort |
| 문제집 | workbook |
| 문제 | question |
| 제출 | submission |
| 학생 | student |
| 강사 | teacher |

## DB 규칙

- PK는 UUID string을 사용한다.
- 모든 주요 테이블은 `created_at`, `updated_at`을 포함한다.
- soft delete가 필요한 테이블은 `deleted_at`을 포함한다.
- 날짜와 시간은 DB에 UTC로 저장한다.
- 클라이언트에 표시할 때만 사용자 환경 또는 서비스 기준 시간대로 변환한다.
- DB 설계는 `docs/ERD.md`를 기준으로 한다.

## API 규칙

- 모든 화면은 `docs/API.md`를 기준으로 개발한다.
- API 응답 구조를 임의로 변경하지 않는다.
- 앱과 웹은 동일한 API를 사용한다.
- API 변경이 필요하면 구현 전에 `docs/API.md`를 먼저 업데이트하고 합의한다.
- mock data를 사용하는 화면은 실제 API 연결 화면과 명확히 구분한다.
- API Request, Response 타입은 가능하면 `/packages/types`에서 공유한다.

## Git 협업 규칙

- `main` 브랜치에 직접 커밋하지 않는다.
- 작업 단위별 `feature` 브랜치를 사용한다.
- 작업 완료 후 PR을 생성하고 리뷰 후 merge한다.
- 같은 파일을 동시에 수정하지 않는다.
- 충돌 가능성이 있는 문서나 공통 파일은 작업 전에 담당자를 정한다.
- PR에는 변경 파일, 변경 이유, 확인 방법을 포함한다.
- 자세한 Git 규칙은 `docs/GIT_RULES.md`를 따른다.

## 영역별 작업 규칙

- 강사용 웹 작업은 `/admin-web` 또는 현재 루트 `src` 범위에서만 진행한다.
- 학생 앱 작업은 `/student-app` 범위에서만 진행한다.
- 백엔드 작업은 `/backend` 범위에서만 진행한다.
- 공통 타입 작업은 `/packages/types` 범위에서만 진행한다.
- 담당 영역 밖 파일 수정이 필요하면 PR 본문에 이유를 명시한다.
- 문서만 수정하는 작업에서는 코드 기능을 구현하지 않는다.

## 작업 범위 원칙

- 한 작업은 하나의 명확한 목적을 가진다.
- 요청받은 범위 밖의 파일은 수정하지 않는다.
- 문서 작업과 코드 구현 작업은 분리한다.
- 기능 구현 전 관련 문서가 최신인지 확인한다.
- mock data를 사용하는 작업과 실제 API 연결 작업을 같은 PR에 섞지 않는다.
- 생성물, 빌드 결과물, 로컬 환경 파일은 커밋하지 않는다.
