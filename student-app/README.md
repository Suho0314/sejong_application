# Student App

학생용 앱 MVP 초기 세팅입니다. Issue #8 범위에 맞춰 Expo 기반 React Native + TypeScript 프로젝트 구조와 기본 라우팅만 구성했습니다.

## 기술 스택

- Expo
- React Native
- TypeScript
- React Navigation

## 폴더 구조

```txt
student-app/
├─ App.tsx
├─ app.json
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ components/
   ├─ mock/
   ├─ navigation/
   ├─ screens/
   ├─ types/
   └─ utils/
```

## 포함 화면

- 로그인 화면 placeholder
- 홈 화면 placeholder
- 문제집 목록 화면 placeholder
- 문제 풀이 화면 placeholder
- 결과 확인 화면 placeholder

## 실행 방법

```bash
cd student-app
npm install
npm run start
```

Expo DevTools 또는 터미널 안내에 따라 Android/iOS/Web 중 원하는 환경으로 실행합니다.

## 테스트 방법

```bash
cd student-app
npm run typecheck
```

앱 실행 후 다음 화면 이동을 확인합니다.

1. 로그인 → 홈
2. 홈 → 문제집 목록
3. 문제집 목록 → 문제 풀이
4. 문제 풀이 → 결과 확인
5. 결과 확인 → 홈

## 참고

- 실제 API 호출 코드는 아직 작성하지 않았습니다.
- 문제집 데이터는 다음 이슈 연결을 고려하여 `src/mock`에 최소 mock 데이터 1건만 둡니다.
- 강사용 웹, 백엔드, 공용 타입 패키지는 수정하지 않았습니다.
