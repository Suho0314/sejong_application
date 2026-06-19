import type {
  StudentPerformanceSummary,
  SubmissionRecord,
} from '../types/student';

export function calculateStudentPerformance(
  submissions: SubmissionRecord[],
  cohortId: string,
): StudentPerformanceSummary {
  const latestSubmissionByWorkbook = new Map<string, SubmissionRecord>();

  [...submissions]
    .filter((submission) => submission.result.cohortId === cohortId)
    .sort(
      (left, right) =>
        new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
    )
    .forEach((submission) => {
      if (!latestSubmissionByWorkbook.has(submission.result.workbookId)) {
        latestSubmissionByWorkbook.set(submission.result.workbookId, submission);
      }
    });

  const latestSubmissions = Array.from(latestSubmissionByWorkbook.values());
  const totalQuestions = latestSubmissions.reduce(
    (sum, submission) => sum + submission.result.totalQuestions,
    0,
  );
  const correctCount = latestSubmissions.reduce(
    (sum, submission) => sum + submission.result.correctCount,
    0,
  );

  return {
    solvedWorkbookCount: latestSubmissions.length,
    totalQuestions,
    correctCount,
    correctRate: totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100),
  };
}
