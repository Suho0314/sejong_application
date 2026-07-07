import type { SolveProgress, StudentAnswer, Workbook } from '../types/student';

type InitialSolveState = {
  currentQuestionIndex: number;
  answers: StudentAnswer[];
};

export function createInitialSolveState(
  workbook: Workbook,
  progress?: SolveProgress,
): InitialSolveState {
  const questions = Array.isArray(workbook.questions) ? workbook.questions : [];

  if (!progress || (progress.status !== 'inProgress' && progress.status !== 'retrying')) {
    return { currentQuestionIndex: 0, answers: [] };
  }

  const lastQuestionIndex = Math.max(questions.length - 1, 0);
  const currentQuestionIndex = Math.min(
    Math.max(progress.currentQuestionIndex, 0),
    lastQuestionIndex,
  );

  const answers = progress.answers.filter((answer) => {
    const question = questions.find((item) => item.id === answer.questionId);
    const choices = Array.isArray(question?.choices) ? question.choices : [];

    return choices.some((choice) => choice.id === answer.selectedChoiceId);
  });

  return { currentQuestionIndex, answers };
}

export function upsertStudentAnswer(
  answers: StudentAnswer[],
  questionId: string,
  selectedChoiceId: string,
): StudentAnswer[] {
  return [
    ...answers.filter((answer) => answer.questionId !== questionId),
    { questionId, selectedChoiceId },
  ];
}

export function calculateSolveProgressRate(
  workbook: Workbook,
  progress?: SolveProgress,
): number {
  const status = progress?.status ?? workbook.status;
  const questions = Array.isArray(workbook.questions) ? workbook.questions : [];

  if (status === 'submitted') {
    return 100;
  }

  if (!progress || questions.length === 0) {
    return 0;
  }

  const answeredQuestionIds = new Set(
    progress.answers
      .filter((answer) =>
        questions.some((question) => {
          const choices = Array.isArray(question.choices) ? question.choices : [];

          return question.id === answer.questionId
            && choices.some((choice) => choice.id === answer.selectedChoiceId);
        }),
      )
      .map((answer) => answer.questionId),
  );

  return Math.round((answeredQuestionIds.size / questions.length) * 100);
}
