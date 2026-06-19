# Student App

학생용 앱 화면 데모입니다. Issue #25 범위에 맞춰 Mock Data와 앱 내부 상태를 이용해 제출 결과와 오답정리 화면을 연동했습니다.

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
- 제출 이력 기반 오답정리 화면
- 프로필 / 내 성적 요약 화면

## Mock Data

실제 API 연결 없이 `src/mock/studentMockData.ts`의 학생, 기수, 문제집, 문항, 보기, 초기 제출 이력을 사용합니다. 새 제출 결과는 `SubmissionHistoryContext`의 앱 내부 상태에 추가됩니다.

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
7. 오답정리에서 문제집별 제출 일시·점수·정답률·오답 수 확인
8. 오답별 문제 본문·선택 답안·정답 확인
9. 하단 탭: 문제집 → 오답정리 → 내 정보

## 참고

- 실제 API 호출 코드는 아직 작성하지 않았습니다.
- 자동 채점과 제출 이력은 앱 메모리에서만 관리하며 서버에 저장하지 않습니다.
- 앱을 완전히 종료하면 새로 추가된 제출 이력은 초기화됩니다.
- 문제별 해설은 구현하지 않습니다.
- 화면 구성은 데모 UI를 참고했지만 웹 전용 코드나 웹 UI 라이브러리는 사용하지 않았습니다.
- 강사용 웹, 백엔드, 공용 타입 패키지는 수정하지 않았습니다.
