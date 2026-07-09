import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import {
  StudentAssignmentApiItem,
  StudentScoreDetailApiItem,
  StudentSubmissionApiItem,
  studentApi,
} from '../api/student';
import { getStudentAccessToken } from '../api/auth';
import type { Cohort, GradedAnswer, SubmissionRecord, SubmissionResult, Workbook } from '../types/student';
import { isAttemptLimitExceededError } from '../utils/submissionAttempt';
import { useAuth } from './AuthContext';

type StudentDataContextValue = {
  cohorts: Cohort[];
  workbooks: Workbook[];
  submissions: SubmissionRecord[];
  isLoading: boolean;
  errorMessage: string;
  refresh: () => Promise<void>;
  getWorkbookDetail: (assignmentId: string) => Promise<Workbook | null>;
  getSubmissionResult: (submissionId: string) => Promise<SubmissionResult | null>;
  submitWorkbook: (
    assignmentId: string,
    answers: Array<{
      workbookQuestionId: string;
      selectedChoiceId?: string | null;
    }>,
  ) => Promise<SubmissionResult>;
};

const StudentDataContext = createContext<StudentDataContextValue | null>(null);

const getAssignmentQuestions = (assignment: StudentAssignmentApiItem) =>
  Array.isArray(assignment.questions) ? assignment.questions : [];

const getAssignmentSubject = (assignment: StudentAssignmentApiItem) =>
  assignment.subject?.trim()
  || getAssignmentQuestions(assignment).find((question) => question.subject?.trim())?.subject.trim()
  || '';

const toWorkbook = (assignment: StudentAssignmentApiItem): Workbook => ({
  id: assignment.assignmentId,
  cohortId: assignment.cohortId,
  title: assignment.workbookTitle ?? '제목 없는 문제집',
  description: assignment.workbookDescription ?? '배포된 문제집입니다.',
  subject: getAssignmentSubject(assignment),
  chapterCount: Math.max(
    1,
    new Set(getAssignmentQuestions(assignment).map((question) => question.category ?? '기본')).size,
  ),
  totalQuestions: getAssignmentQuestions(assignment).length || assignment.questionCount || 0,
  estimatedMinutes: Math.max(5, (getAssignmentQuestions(assignment).length || assignment.questionCount || 0) * 2),
  status: assignment.learningStatus === 'submitted' ? 'submitted' : 'notStarted',
  maxAttempts: assignment.maxAttempts,
  submittedCount: assignment.submittedCount,
  correctRate: assignment.latestScore ?? undefined,
  questions: getAssignmentQuestions(assignment).map((question) => ({
    id: question.workbookQuestionId,
    sequence: question.sequence,
    content: question.content ?? '문항 내용이 없습니다.',
    choices: Array.isArray(question.choices) ? question.choices : [],
    answerIndex: 0,
  })),
});

type ResultSource = StudentSubmissionApiItem | StudentScoreDetailApiItem;

const isScoreDetail = (submission: ResultSource): submission is StudentScoreDetailApiItem =>
  'workbook' in submission;

const toResult = (submission: ResultSource): SubmissionResult => {
  const answers = isScoreDetail(submission)
    ? submission.answers
    : (submission.answers ?? submission.gradedAnswers ?? []);
  const gradedAnswers: GradedAnswer[] = answers.map((answer) => ({
    questionId: answer.workbookQuestionId,
    sequence: answer.sequence,
    questionContent: 'questionContent' in answer ? answer.questionContent : answer.content,
    choices: answer.choices,
    selectedChoiceId: answer.selectedChoiceId ?? undefined,
    selectedChoiceText: ('selectedChoiceText' in answer ? answer.selectedChoiceText : answer.selectedAnswer) ?? '미응답',
    correctChoiceId: answer.correctChoiceId ?? '',
    correctChoiceText: ('correctChoiceText' in answer ? answer.correctChoiceText : answer.correctAnswer) ?? '-',
    isCorrect: answer.isCorrect,
  }));

  return {
    workbookId: submission.assignmentId,
    workbookTitle: isScoreDetail(submission) ? submission.workbook.title : submission.workbookTitle,
    cohortId: isScoreDetail(submission) ? submission.cohort.id : submission.cohortId,
    totalQuestions: submission.totalQuestions,
    correctCount: submission.correctCount,
    wrongCount: submission.wrongCount,
    correctRate: Math.round(submission.correctRate),
    score: Math.round(submission.score),
    gradedAnswers,
  };
};

const toSubmissionRecord = (submission: StudentSubmissionApiItem): SubmissionRecord => ({
  id: submission.id,
  submittedAt: submission.submittedAt ?? new Date().toISOString(),
  result: toResult(submission),
});

const toScoreSubmissionRecord = (score: StudentScoreDetailApiItem): SubmissionRecord => ({
  id: score.submissionId,
  submittedAt: score.submittedAt ?? score.updatedAt,
  result: toResult(score),
});

export function StudentDataProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, logout, user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignmentApiItem[]>([]);
  const [detailedWorkbooks, setDetailedWorkbooks] = useState<Record<string, Workbook>>({});
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleError = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;

    setErrorMessage(message);
    if (!getStudentAccessToken() || message.includes('만료') || message.includes('Unauthorized')) {
      logout('로그인이 만료되었습니다. 다시 로그인해주세요.');
    }
  }, [logout]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [assignmentResponse, submissionResponse, scoreResponse] = await Promise.all([
        studentApi.listAssignments(),
        studentApi.listSubmissions(),
        studentApi.listScores(),
      ]);

      setAssignments(assignmentResponse.data);
      const scoreDetails = await Promise.all(
        scoreResponse.data.map((score) => studentApi.getScore(score.submissionId)),
      );
      const detailedRecords = scoreDetails.map((response) => toScoreSubmissionRecord(response.data));
      const detailedIds = new Set(detailedRecords.map((record) => record.id));
      const listOnlyRecords = submissionResponse.data
        .filter((submission) => !detailedIds.has(submission.id))
        .map(toSubmissionRecord);

      setSubmissions([...detailedRecords, ...listOnlyRecords]);
    } catch (error) {
      handleError(error, '학생 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, isAuthenticated]);

  const getWorkbookDetail = useCallback(async (assignmentId: string) => {
    const existing = detailedWorkbooks[assignmentId];
    if (existing) return existing;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await studentApi.getAssignment(assignmentId);
      const workbook = toWorkbook(response.data);

      setDetailedWorkbooks((current) => ({
        ...current,
        [assignmentId]: workbook,
      }));
      return workbook;
    } catch (error) {
      handleError(error, '문제집 상세를 불러오지 못했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [detailedWorkbooks, handleError]);

  const getSubmissionResult = useCallback(async (submissionId: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [submissionResponse, scoreResponse] = await Promise.all([
        studentApi.getSubmission(submissionId),
        studentApi.getScore(submissionId),
      ]);
      const result = scoreResponse.data.answers?.length
        ? toResult(scoreResponse.data)
        : toResult(submissionResponse.data);

      setSubmissions((current) => {
        const nextRecord: SubmissionRecord = {
          id: submissionId,
          submittedAt: scoreResponse.data.submittedAt ?? submissionResponse.data.submittedAt ?? new Date().toISOString(),
          result,
        };

        return [nextRecord, ...current.filter((record) => record.id !== submissionId)];
      });

      return result;
    } catch (error) {
      handleError(error, '성적 상세를 불러오지 못했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const submitWorkbook = useCallback(async (
    assignmentId: string,
    answers: Array<{
      workbookQuestionId: string;
      selectedChoiceId?: string | null;
    }>,
  ) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await studentApi.createSubmission({
        assignmentId,
        startedAt: new Date().toISOString(),
        answers,
      });
      const record = toSubmissionRecord(response.data);

      setSubmissions((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      await refresh();
      return record.result;
    } catch (error) {
      if (isAttemptLimitExceededError(error)) {
        setErrorMessage('');
      } else {
        handleError(error, '답안을 제출하지 못했습니다.');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, refresh]);

  const workbooks = useMemo(() => assignments.map((assignment) => {
    const detailedWorkbook = detailedWorkbooks[assignment.assignmentId];
    return detailedWorkbook ?? toWorkbook(assignment);
  }), [assignments, detailedWorkbooks]);

  const cohorts = useMemo<Cohort[]>(() => {
    const cohortMap = new Map<string, Cohort>();

    assignments.forEach((assignment) => {
      cohortMap.set(assignment.cohortId, {
        id: assignment.cohortId,
        name: assignment.cohortName,
        courseName: assignment.cohortName,
        period: `${assignment.opensAt.slice(0, 10)} ~ ${assignment.closesAt?.slice(0, 10) ?? '상시'}`,
      });
    });

    if (cohortMap.size === 0 && user?.cohortId) {
      cohortMap.set(user.cohortId, {
        id: user.cohortId,
        name: '내 기수',
        courseName: '배포 문제집',
        period: '배포된 문제집을 확인하세요.',
      });
    }

    return Array.from(cohortMap.values());
  }, [assignments, user?.cohortId]);

  const value = useMemo<StudentDataContextValue>(() => ({
    cohorts,
    workbooks,
    submissions,
    isLoading,
    errorMessage,
    refresh,
    getWorkbookDetail,
    getSubmissionResult,
    submitWorkbook,
  }), [cohorts, errorMessage, getSubmissionResult, getWorkbookDetail, isLoading, refresh, submissions, submitWorkbook, workbooks]);

  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export function useStudentData() {
  const context = useContext(StudentDataContext);

  if (!context) {
    throw new Error('useStudentData must be used inside StudentDataProvider.');
  }

  return context;
}
