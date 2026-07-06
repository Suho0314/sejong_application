import type {
  AnswerReviewMode,
  GradedAnswer,
  SubmissionRecord,
  WrongAnswerHistoryGroup,
} from '../types/student';

type MutableWrongAnswerGroup = WrongAnswerHistoryGroup & {
  answerByQuestionId: Map<string, GradedAnswer>;
};

export function buildWrongAnswerHistory(
  submissions: SubmissionRecord[],
  cohortId: string,
  reviewMode: AnswerReviewMode = 'incorrect',
): WrongAnswerHistoryGroup[] {
  const sortedSubmissions = [...submissions]
    .filter((submission) => submission.result.cohortId === cohortId)
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    );

  const groupByWorkbookId = new Map<string, MutableWrongAnswerGroup>();

  sortedSubmissions.forEach((submission) => {
    const { result } = submission;
    let group = groupByWorkbookId.get(result.workbookId);

    if (!group) {
      group = {
        submissionId: submission.id,
        workbookId: result.workbookId,
        workbookTitle: result.workbookTitle,
        latestSubmittedAt: submission.submittedAt,
        latestScore: result.score,
        latestCorrectRate: result.correctRate,
        reviewMode,
        answers: [],
        wrongAnswers: [],
        answerByQuestionId: new Map(),
      };
      groupByWorkbookId.set(result.workbookId, group);
    }

    (result.gradedAnswers ?? [])
      .filter((answer) => (reviewMode === 'correct' ? answer.isCorrect : !answer.isCorrect))
      .forEach((answer) => {
        if (!group?.answerByQuestionId.has(answer.questionId)) {
          group?.answerByQuestionId.set(answer.questionId, answer);
        }
      });
  });

  return Array.from(groupByWorkbookId.values())
    .map(({ answerByQuestionId, ...group }) => {
      const answers = Array.from(answerByQuestionId.values());

      return {
        ...group,
        answers,
        wrongAnswers: reviewMode === 'incorrect' ? answers : [],
      };
    })
    .filter((group) => group.answers.length > 0)
    .sort(
      (left, right) =>
        new Date(right.latestSubmittedAt).getTime() -
        new Date(left.latestSubmittedAt).getTime(),
    );
}
