# Student App

학생용 앱 화면 데모입니다. Issue #23 범위에 맞춰 Mock Data 기반 문제 풀이 제출, 자동 채점, 결과 및 오답 확인 흐름을 React Native/Expo 방식으로 구현했습니다.

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
- 문제집 상세 화면
- 문제 풀이 화면
- 자동 채점 결과 화면
- 제출 결과 오답 확인 화면
- 오답정리 화면
- 프로필 / 내 성적 요약 화면

## Mock Data

실제 API 연결 없이 `src/mock/studentMockData.ts`의 학생, 기수, 문제집, 문항, 보기 데이터를 사용합니다. 제출 시 선택 답안과 정답을 화면 상태에서 비교합니다.

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
3. 문제집 선택 → 문제집 상세 → 풀이 시작
4. 보기 선택 → 이전/다음 문제 이동 → 제출하기
5. 자동 채점 결과와 오답 목록 확인
6. 결과 화면 → 문제집 목록 또는 오답정리
7. 하단 탭: 문제집 → 오답정리 → 내 정보

## 참고

- 실제 API 호출 코드는 아직 작성하지 않았습니다.
- 자동 채점은 앱 화면 상태에서만 수행하며 결과를 서버에 저장하지 않습니다.
- 화면 구성은 데모 UI를 참고했지만 웹 전용 코드나 웹 UI 라이브러리는 사용하지 않았습니다.
- 강사용 웹, 백엔드, 공용 타입 패키지는 수정하지 않았습니다.
