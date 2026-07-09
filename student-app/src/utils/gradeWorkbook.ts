import type { StudentAnswer, SubmissionResult, Workbook } from '../types/student';

export function gradeWorkbook(
  workbook: Workbook,
  studentAnswers: StudentAnswer[],
): SubmissionResult {
  const gradedAnswers = workbook.questions.map((question, questionIndex) => {
    const studentAnswer = studentAnswers.find((answer) => answer.questionId === question.id);
    const selectedChoice = question.choices.find(
      (choice) => choice.id === studentAnswer?.selectedChoiceId,
    );
    const correctChoice = question.choices[question.answerIndex];

    return {
      questionId: question.id,
      sequence: question.sequence ?? questionIndex + 1,
      questionContent: question.content,
      choices: question.choices,
      selectedChoiceId: selectedChoice?.id,
      selectedChoiceText: selectedChoice?.text ?? '미응답',
      correctChoiceId: correctChoice.id,
      correctChoiceText: correctChoice.text,
      isCorrect: selectedChoice?.id === correctChoice.id,
    };
  });

  const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;
  const totalQuestions = workbook.questions.length;
  const wrongCount = totalQuestions - correctCount;
  const correctRate = totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100);

  return {
    workbookId: workbook.id,
    workbookTitle: workbook.title,
    cohortId: workbook.cohortId,
    totalQuestions,
    correctCount,
    wrongCount,
    correctRate,
    score: correctRate,
    gradedAnswers,
  };
}
