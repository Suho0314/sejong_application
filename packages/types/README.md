# Shared Types

웹, 앱, 백엔드가 함께 사용할 TypeScript 타입을 관리하는 영역입니다.

## 역할

- API Request 타입
- API Response 타입
- 공통 Entity 타입
- 공통 enum 또는 literal union 타입

## 작업 규칙

- 특정 영역에만 필요한 타입은 해당 영역 내부에 둡니다.
- 두 개 이상 영역에서 사용하는 타입만 이 폴더에 둡니다.
- 타입 변경 시 `docs/API.md` 또는 `docs/ERD.md`와 충돌하지 않는지 확인합니다.

## 현재 상태

협업을 위한 폴더만 생성되어 있으며 기능 구현은 없습니다.
