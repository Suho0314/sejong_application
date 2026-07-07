export type QuestionAccuracyRow = {
  questionId: string;
  content: string;
  subject: string;
  category?: string;
  answerCount: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  wrongRate: number;
};

type QuestionAccuracyTableProps = {
  questions: QuestionAccuracyRow[];
  variant?: 'accuracy' | 'wrong';
};

const formatRate = (value: number) => `${Math.round(value)}%`;

export function QuestionAccuracyTable({ questions, variant = 'accuracy' }: QuestionAccuracyTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제</th>
            <th>과목</th>
            <th>응답수</th>
            <th>정답</th>
            <th>오답</th>
            <th>{variant === 'wrong' ? '오답률' : '정답률'}</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.questionId}>
              <td>
                <div className="table-title">{question.content}</div>
                <span className="table-subtitle">{question.category ?? '미분류'}</span>
              </td>
              <td>{question.subject}</td>
              <td>{question.answerCount.toLocaleString('ko-KR')}건</td>
              <td>{question.correctCount.toLocaleString('ko-KR')}건</td>
              <td>{question.wrongCount.toLocaleString('ko-KR')}건</td>
              <td>
                <strong>{formatRate(variant === 'wrong' ? question.wrongRate : question.accuracyRate)}</strong>
              </td>
            </tr>
          ))}
          {questions.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={6}>
                분석할 답안 데이터가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
