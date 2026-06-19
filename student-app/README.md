# Student App

학생용 앱 화면 데모입니다. Issue #9 범위에 맞춰 `학원관리앱데모UI`의 모바일 카드형 디자인을 참고하되, 코드는 React Native/Expo 방식으로 작성했습니다.

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

- 로그인 화면
- 기수 선택 화면
- 문제집 목록 화면
- 오답정리 화면
- 프로필 / 내 성적 요약 화면

## Mock Data

실제 API 연결 없이 `src/mock/studentMockData.ts`의 학생, 기수, 문제집, 풀이 결과 데이터를 사용합니다.

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

1. 로그인 → 기수 선택
2. 기수 선택 → 문제집 목록
3. 하단 탭: 문제집 → 오답정리 → 내 정보
4. 상단 프로필 버튼 → 내 정보

## 참고

- 실제 API 호출 코드는 아직 작성하지 않았습니다.
- 화면 구성은 데모 UI를 참고했지만 웹 전용 코드나 웹 UI 라이브러리는 사용하지 않았습니다.
- 강사용 웹, 백엔드, 공용 타입 패키지는 수정하지 않았습니다.
