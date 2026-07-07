# Contributing

## 기본 원칙

- 작업 전 관련 문서를 확인합니다.
- 한 PR은 하나의 목적만 가집니다.
- 담당 폴더 외 파일은 수정하지 않습니다.
- 기능 구현과 문서 정리는 가능하면 별도 PR로 나눕니다.
- API, DB, UI 구조 변경이 필요하면 먼저 `docs` 문서를 업데이트합니다.

## PR 규칙

PR에는 다음 내용을 포함합니다.

- 작업 목적
- 변경 파일 요약
- 화면 변경이 있으면 스크린샷 또는 확인 경로
- 실행한 검증 명령
- 리뷰어가 확인해야 할 점

PR 전 확인합니다.

- 빌드가 성공하는지 확인합니다.
- 불필요한 생성 파일이 포함되지 않았는지 확인합니다.
- 담당 영역 밖 파일을 수정하지 않았는지 확인합니다.
- mock data와 실제 API 호출을 혼용하지 않았는지 확인합니다.

## 커밋 메시지 규칙

커밋 메시지는 다음 형식을 사용합니다.

```text
type(scope): summary
```

사용 가능한 type:

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 포맷, 스타일 변경
- `refactor`: 리팩터링
- `test`: 테스트 추가 또는 수정
- `chore`: 설정, 빌드, 기타 작업

예시:

```text
feat(admin): add cohort table
docs(api): update workbook assignment spec
chore(root): add env example
```

## 담당 폴더 외 수정 금지

- `admin-web` 작업자는 `student-app`, `backend`를 수정하지 않습니다.
- `student-app` 작업자는 `admin-web`, `backend`를 수정하지 않습니다.
- `backend` 작업자는 `admin-web`, `student-app`을 수정하지 않습니다.
- 공통 타입 수정이 필요하면 `/packages/types` 변경 사유를 PR에 명시합니다.
- 문서 수정이 필요하면 관련 기능 변경과 함께 PR 설명에 이유를 적습니다.

## 리뷰 기준

- 요구사항과 문서 기준을 따르는가
- 담당 영역만 수정했는가
- 타입 안정성을 해치지 않는가
- API 응답 구조를 임의로 바꾸지 않았는가
- 기존 기능을 삭제하거나 깨뜨리지 않았는가
