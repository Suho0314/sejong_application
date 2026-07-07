import { apiRequest } from '.';
import { Difficulty, SubmissionStatus } from '../types/domain';

export type SubmissionAnswerApiItem = {
  id: string;
  workbookQuestionId: string;
  questionId: string;
  sequence: number;
  questionContent: string;
  explanation: string | null;
  type: 'multiple_choice';
  subject: string;
  category: string | null;
  difficulty: Difficulty;
  choices: Array<{
    id: string;
    text: string;
  }>;
  selectedChoiceId: string | null;
  selectedChoiceText: string | null;
  correctChoiceId: string | null;
  correctChoiceText: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  gradedAt: string | null;
};

export type SubmissionDetailApiItem = {
  id: string;
  assignmentId: string;
  workbookAssignmentId: string;
  workbookId: string;
  workbookTitle: string;
  cohortId: string;
  cohortName: string;
  studentId: string;
  studentName: string;
  studentNo: string | null;
  attemptNo: number;
  status: SubmissionStatus;
  score: number;
  earnedPoints: number;
  totalPoints: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  correctRate: number;
  submittedAt: string | null;
  startedAt: string;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
  answers: SubmissionAnswerApiItem[];
  gradedAnswers?: SubmissionAnswerApiItem[];
};

type SubmissionDetailResponse = {
  data: SubmissionDetailApiItem;
};

export const submissionApi = {
  get(submissionId: string) {
    return apiRequest<SubmissionDetailResponse>(`/admin/submissions/${submissionId}`);
  },
};
