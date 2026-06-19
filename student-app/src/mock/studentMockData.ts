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
    subject: '기초간호학',
    chapterCount: 5,
    questionCount: 100,
    status: 'completed',
    correctRate: 82,
  },
  {
    id: 'workbook-2',
    cohortId: 'cohort-2026-05',
    title: '보건간호학 실전 문제집',
    subject: '보건간호학',
    chapterCount: 4,
    questionCount: 80,
    status: 'inProgress',
    correctRate: 64,
  },
  {
    id: 'workbook-3',
    cohortId: 'cohort-2026-05',
    title: '공중보건학 출제 예상 문제',
    subject: '공중보건학',
    chapterCount: 6,
    questionCount: 120,
    status: 'notStarted',
  },
  {
    id: 'workbook-4',
    cohortId: 'cohort-2026-05',
    title: '의료관계법규 요점 문제',
    subject: '의료관계법규',
    chapterCount: 3,
    questionCount: 60,
    status: 'completed',
    correctRate: 76,
  },
  {
    id: 'workbook-5',
    cohortId: 'cohort-2026-04',
    title: '요양보호개론 모의고사',
    subject: '요양보호개론',
    chapterCount: 4,
    questionCount: 80,
    status: 'completed',
    correctRate: 88,
  },
];

export const mockResults: WorkbookResult[] = [
  {
    id: 'result-1',
    workbookId: 'workbook-1',
    solvedQuestionCount: 100,
    correctCount: 82,
    wrongCount: 18,
    correctRate: 82,
    submittedAt: '2026-06-15',
  },
  {
    id: 'result-2',
    workbookId: 'workbook-2',
    solvedQuestionCount: 50,
    correctCount: 32,
    wrongCount: 18,
    correctRate: 64,
    submittedAt: '2026-06-17',
  },
  {
    id: 'result-3',
    workbookId: 'workbook-4',
    solvedQuestionCount: 60,
    correctCount: 46,
    wrongCount: 14,
    correctRate: 76,
    submittedAt: '2026-06-12',
  },
];
