# Student App

학생용 앱입니다. 학생 로그인, 배포된 문제집 조회, 문제 풀이, 제출, 채점 결과와 내 성적 조회를 backend API와 연동합니다.

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
   ├─ api/
   ├─ navigation/
   ├─ screens/
   ├─ state/
   ├─ types/
   └─ utils/
```

## 포함 화면

- 로그인 화면
- 기수 선택 화면
- 문제집 목록 화면
- 문제집 상세 화면
- 문제 풀이 화면
- 문제 풀이 이어하기
- 자동 채점 결과 화면
- 제출 결과 오답 확인 화면
- 제출 이력 기반 오답정리 화면
- 프로필 / 내 성적 요약 화면

## API 연동

- `POST /api/auth/student/login`
- `GET /api/student/assignments`
- `GET /api/student/assignments/:assignmentId`
- `POST /api/student/submissions`
- `GET /api/student/submissions`
- `GET /api/student/submissions/:submissionId`
- `GET /api/student/scores`
- `GET /api/student/scores/:submissionId`

환경변수는 `VITE_API_BASE_URL`만 설정합니다. Student App은 Supabase를 직접 사용하지 않고 Backend API만 호출합니다.

```bash
VITE_API_BASE_URL=https://your-backend.example.com
```

환경변수를 지정하지 않으면 기본값으로 Railway Backend
`https://sejongapplication-production.up.railway.app`를 사용합니다.
로컬 Backend를 테스트할 때만 `.env`에 아래처럼 오버라이드합니다.

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Expo Web으로 실행하면 보통 Origin은 `http://localhost:8081`입니다.
Vite로 실행하는 경우 Origin은 `http://localhost:5173`입니다.
Railway Backend의 `CORS_ORIGIN`에는 실제 실행 Origin이 포함되어야 합니다.
`SUPABASE_URL`, `SUPABASE_ANON_KEY`는 현재 사용하지 않습니다.

## 문제집 상태

- `notStarted`: 풀이 전
- `inProgress`: 풀이 중
- `retrying`: 다시 푸는 중
- `submitted`: 완료

상태에 따라 상세 화면 버튼은 `풀이 시작`, `풀이 이어하기`, `다시 풀기`로 표시됩니다.

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
npm run build
```

앱 실행 후 다음 화면 이동을 확인합니다.

1. 로그인 → 기수 선택
2. 기수 선택 → 문제집 목록
3. 문제집 선택 → 문제집 상세 → 풀이 시작
4. 보기 선택 → 이전/다음 문제 이동 → 상세 화면으로 돌아가기
5. `풀이 이어하기` → 마지막 문항 위치와 기존 선택 답안 확인
6. 마지막 문제 제출 → 진행 상태가 완료로 변경되는지 확인
7. 자동 채점 결과와 오답 목록 확인
8. 결과 화면 → 문제집 목록 또는 오답정리
9. 하단 탭: 문제집 → 오답정리 → 내 정보

## 참고

- 로그인 토큰은 웹 환경에서는 `localStorage`, 네이티브 환경에서는 앱 실행 중 메모리 fallback을 사용합니다.
- 자동 채점은 backend 제출 API 결과를 사용합니다.
- 문제 풀이 진행 상태는 앱 내부 상태에 임시 저장됩니다.
- 강사용 웹, 백엔드, 공용 타입 패키지는 수정하지 않았습니다.
