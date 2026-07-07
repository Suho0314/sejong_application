# Git Rules

## 기본 원칙

- `main` 브랜치는 항상 배포 가능한 상태로 유지한다.
- `main` 브랜치에 직접 커밋하지 않는다.
- 모든 작업은 별도 브랜치에서 진행한다.
- PR 리뷰 후 merge한다.

## 브랜치 네이밍

| 유형 | 형식 | 예시 |
| --- | --- | --- |
| 기능 | `feature/{area}-{name}` | `feature/admin-dashboard` |
| 버그 수정 | `fix/{area}-{name}` | `fix/backend-login` |
| 문서 | `docs/{name}` | `docs/git-rules` |
| 설정 | `chore/{name}` | `chore/env-example` |

area 예시:

- `admin`
- `student`
- `backend`
- `types`
- `docs`

## 커밋 메시지

커밋 메시지는 다음 형식을 사용한다.

```text
type(scope): summary
```

type:

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: UI 또는 포맷 변경
- `refactor`: 리팩터링
- `test`: 테스트 추가 또는 수정
- `chore`: 설정, 빌드, 기타 작업

예시:

```text
feat(admin): add workbook builder
fix(student): handle empty submission
docs(rules): add git collaboration rules
```

## PR 규칙

- PR 제목은 작업 내용을 명확히 쓴다.
- PR 본문에는 변경 이유, 변경 파일, 검증 방법을 작성한다.
- 화면 변경은 스크린샷 또는 확인 URL을 포함한다.
- API 변경은 `docs/API.md` 변경을 함께 포함한다.
- DB 변경은 `docs/ERD.md` 변경을 함께 포함한다.

## 충돌 방지

- 같은 파일을 동시에 수정하지 않는다.
- 공통 파일 수정 전에는 팀원에게 공유한다.
- `docs/API.md`, `docs/ERD.md`, 공통 타입은 충돌 가능성이 높으므로 작업 전 담당자를 정한다.

## 금지 사항

- `main` 직접 push 금지
- 리뷰 없는 merge 금지
- 담당 폴더 외 대규모 수정 금지
- 생성물 커밋 금지
- 비밀키 또는 개인 환경 변수 커밋 금지
