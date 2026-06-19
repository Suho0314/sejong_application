import type {
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
        workbookId: result.workbookId,
        workbookTitle: result.workbookTitle,
        latestSubmittedAt: submission.submittedAt,
        latestScore: result.score,
        latestCorrectRate: result.correctRate,
        wrongAnswers: [],
        answerByQuestionId: new Map(),
      };
      groupByWorkbookId.set(result.workbookId, group);
    }

    (result.gradedAnswers ?? [])
      .filter((answer) => !answer.isCorrect)
      .forEach((answer) => {
        if (!group?.answerByQuestionId.has(answer.questionId)) {
          group?.answerByQuestionId.set(answer.questionId, answer);
        }
      });
  });

  return Array.from(groupByWorkbookId.values())
    .map(({ answerByQuestionId, ...group }) => ({
      ...group,
      wrongAnswers: Array.from(answerByQuestionId.values()),
    }))
    .filter((group) => group.wrongAnswers.length > 0);
}
