import type { Cohort, Student, Workbook, WorkbookResult } from '../types/student';

export const mockStudent: Student = {
  id: 'student-1',
  name: '이하늘',
  loginId: 'student01',
  cohortId: 'cohort-2026-05',
};

export const mockCohorts: Cohort[] = [
  {
    id: 'cohort-2026-05',
    name: '2026년 5월 간호조무사반',
    courseName: '간호조무사',
    period: '2026.05.10 ~ 2026.09.30',
  },
  {
    id: 'cohort-2026-04',
    name: '2026년 4월 요양보호사반',
    courseName: '요양보호사',
    period: '2026.04.07 ~ 2026.07.25',
  },
];

export const mockWorkbooks: Workbook[] = [
  {
    id: 'workbook-1',
    cohortId: 'cohort-2026-05',
    title: '기초간호학 핵심 모의고사 1회',
    description: '활력징후와 기본 간호 원칙을 중심으로 구성한 핵심 문제집입니다.',
    subject: '기초간호학',
    chapterCount: 5,
    totalQuestions: 2,
    estimatedMinutes: 5,
    status: 'completed',
    correctRate: 100,
    questions: [
      {
        id: 'question-1-1',
        content: '성인의 정상 맥박 범위로 가장 적절한 것은?',
        choices: [
          { id: 'choice-1-1-1', text: '분당 20~40회' },
          { id: 'choice-1-1-2', text: '분당 40~60회' },
          { id: 'choice-1-1-3', text: '분당 60~100회' },
          { id: 'choice-1-1-4', text: '분당 100~140회' },
        ],
        answerIndex: 2,
      },
      {
        id: 'question-1-2',
        content: '간호 행위 전 대상자를 확인하는 방법으로 가장 적절한 것은?',
        choices: [
          { id: 'choice-1-2-1', text: '병실 번호만 확인한다' },
          { id: 'choice-1-2-2', text: '이름과 생년월일을 확인한다' },
          { id: 'choice-1-2-3', text: '보호자에게만 질문한다' },
          { id: 'choice-1-2-4', text: '침상 위치만 확인한다' },
        ],
        answerIndex: 1,
      },
    ],
  },
  {
    id: 'workbook-2',
    cohortId: 'cohort-2026-05',
    title: '보건간호학 실전 문제집',
    description: '지역사회 간호와 건강증진의 주요 개념을 실전 문제로 점검합니다.',
    subject: '보건간호학',
    chapterCount: 4,
    totalQuestions: 2,
    estimatedMinutes: 5,
    status: 'inProgress',
    correctRate: 50,
    questions: [
      {
        id: 'question-2-1',
        content: '지역사회 보건사업의 가장 우선적인 목적은?',
        choices: [
          { id: 'choice-2-1-1', text: '의료기관의 수익 증가' },
          { id: 'choice-2-1-2', text: '지역주민의 건강 수준 향상' },
          { id: 'choice-2-1-3', text: '입원 기간 연장' },
          { id: 'choice-2-1-4', text: '진료 과목 축소' },
        ],
        answerIndex: 1,
      },
      {
        id: 'question-2-2',
        content: '건강증진을 위한 일차 예방 활동에 해당하는 것은?',
        choices: [
          { id: 'choice-2-2-1', text: '예방접종' },
          { id: 'choice-2-2-2', text: '재활치료' },
          { id: 'choice-2-2-3', text: '합병증 관리' },
          { id: 'choice-2-2-4', text: '수술 후 간호' },
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 'workbook-3',
    cohortId: 'cohort-2026-05',
    title: '공중보건학 출제 예상 문제',
    description: '감염병 예방과 환경보건에서 자주 출제되는 내용을 모았습니다.',
    subject: '공중보건학',
    chapterCount: 6,
    totalQuestions: 2,
    estimatedMinutes: 5,
    status: 'notStarted',
    questions: [
      {
        id: 'question-3-1',
        content: '감염병 전파를 예방하는 가장 기본적인 방법은?',
        choices: [
          { id: 'choice-3-1-1', text: '올바른 손 위생' },
          { id: 'choice-3-1-2', text: '수면 시간 단축' },
          { id: 'choice-3-1-3', text: '수분 섭취 제한' },
          { id: 'choice-3-1-4', text: '실내 환기 중단' },
        ],
        answerIndex: 0,
      },
      {
        id: 'question-3-2',
        content: '깨끗한 생활용수를 공급하는 주된 목적은?',
        choices: [
          { id: 'choice-3-2-1', text: '수인성 질환 예방' },
          { id: 'choice-3-2-2', text: '소음 증가' },
          { id: 'choice-3-2-3', text: '대기오염 증가' },
          { id: 'choice-3-2-4', text: '폐기물 증가' },
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 'workbook-4',
    cohortId: 'cohort-2026-05',
    title: '의료관계법규 요점 문제',
    description: '의료인의 의무와 주요 의료관계 법규를 간단히 복습합니다.',
    subject: '의료관계법규',
    chapterCount: 3,
    totalQuestions: 2,
    estimatedMinutes: 5,
    status: 'completed',
    correctRate: 50,
    questions: [
      {
        id: 'question-4-1',
        content: '환자의 개인정보를 보호해야 하는 주된 이유는?',
        choices: [
          { id: 'choice-4-1-1', text: '진료비를 높이기 위해' },
          { id: 'choice-4-1-2', text: '환자의 권리와 사생활을 보호하기 위해' },
          { id: 'choice-4-1-3', text: '업무 시간을 늘리기 위해' },
          { id: 'choice-4-1-4', text: '기록을 삭제하기 위해' },
        ],
        answerIndex: 1,
      },
      {
        id: 'question-4-2',
        content: '의료기록을 작성할 때 가장 적절한 태도는?',
        choices: [
          { id: 'choice-4-2-1', text: '사실에 근거해 정확히 기록한다' },
          { id: 'choice-4-2-2', text: '기억에 의존해 나중에 기록한다' },
          { id: 'choice-4-2-3', text: '중요 내용을 생략한다' },
          { id: 'choice-4-2-4', text: '타인의 기록을 그대로 복사한다' },
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 'workbook-5',
    cohortId: 'cohort-2026-04',
    title: '요양보호개론 모의고사',
    description: '요양보호의 기본 원칙과 대상자 지원 방법을 확인합니다.',
    subject: '요양보호개론',
    chapterCount: 4,
    totalQuestions: 2,
    estimatedMinutes: 5,
    status: 'completed',
    correctRate: 100,
    questions: [
      {
        id: 'question-5-1',
        content: '요양보호 제공 시 가장 우선해야 하는 것은?',
        choices: [
          { id: 'choice-5-1-1', text: '대상자의 안전과 존엄성' },
          { id: 'choice-5-1-2', text: '업무 속도' },
          { id: 'choice-5-1-3', text: '보호자의 편의만 고려' },
          { id: 'choice-5-1-4', text: '개인정보 공개' },
        ],
        answerIndex: 0,
      },
      {
        id: 'question-5-2',
        content: '낙상 예방을 위한 환경 관리로 적절한 것은?',
        choices: [
          { id: 'choice-5-2-1', text: '통로에 물건을 둔다' },
          { id: 'choice-5-2-2', text: '바닥의 물기를 즉시 제거한다' },
          { id: 'choice-5-2-3', text: '조명을 어둡게 한다' },
          { id: 'choice-5-2-4', text: '미끄러운 양말을 신긴다' },
        ],
        answerIndex: 1,
      },
    ],
  },
];

export const mockResults: WorkbookResult[] = [
  {
    id: 'result-1',
    workbookId: 'workbook-1',
    solvedQuestionCount: 2,
    correctCount: 2,
    wrongCount: 0,
    correctRate: 100,
    submittedAt: '2026-06-15',
  },
  {
    id: 'result-2',
    workbookId: 'workbook-2',
    solvedQuestionCount: 2,
    correctCount: 1,
    wrongCount: 1,
    correctRate: 50,
    submittedAt: '2026-06-17',
  },
  {
    id: 'result-3',
    workbookId: 'workbook-4',
    solvedQuestionCount: 2,
    correctCount: 1,
    wrongCount: 1,
    correctRate: 50,
    submittedAt: '2026-06-12',
  },
];
