import { CSSProperties } from 'react';
import { QuestionStatusLabel } from '../../constants/statusLabels';
import { ContentStatus, QuestionType } from '../../types/domain';

export type QuestionRow = {
  id: string;
  subject: string;
  category?: string;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  answerCount: number;
  correctCount: number;
  wrongCount: number;
  wrongRate: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type QuestionTableProps = {
  questions: QuestionRow[];
  selectedQuestionIds?: Set<string>;
  onToggleSelect?: (questionId: string) => void;
  onToggleSelectAll?: () => void;
  onDelete: (questionId: string) => void;
  onEdit: (question: QuestionRow) => void;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

const contentPreviewStyle: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  whiteSpace: 'normal',
};

const formatWrongRate = (wrongRate: number) =>
  new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(wrongRate);

const formatWrongRateSummary = (question: QuestionRow) => {
  if (question.answerCount === 0) {
    return '- / 0건';
  }

  return `${formatWrongRate(question.wrongRate)}% / ${question.answerCount}건`;
};

export function QuestionTable({
  questions,
  selectedQuestionIds = new Set<string>(),
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onEdit,
}: QuestionTableProps) {
  const hasRows = questions.length > 0;
  const allVisibleSelected = hasRows && questions.every((question) => selectedQuestionIds.has(question.id));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <input
                aria-label="현재 페이지 문제 전체 선택"
                checked={allVisibleSelected}
                disabled={!hasRows || !onToggleSelectAll}
                type="checkbox"
                onChange={onToggleSelectAll}
              />
            </th>
            <th>문제</th>
            <th>과목</th>
            <th>카테고리</th>
            <th>상태</th>
            <th>정답</th>
            <th>오답률</th>
            <th>생성일</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>
                <input
                  aria-label={`문항 선택: ${question.content.slice(0, 30)}`}
                  checked={selectedQuestionIds.has(question.id)}
                  disabled={!onToggleSelect}
                  type="checkbox"
                  onChange={() => onToggleSelect?.(question.id)}
                />
              </td>
              <td>
                <div className="table-title" style={contentPreviewStyle}>
                  {question.content}
                </div>
                <span className="table-subtitle">
                  {question.subject} │ {question.category || '미분류'} │ {QuestionStatusLabel[question.status]}
                </span>
              </td>
              <td>{question.subject}</td>
              <td>{question.category || '-'}</td>
              <td>
                <span className={`status-pill status-${question.status}`}>{QuestionStatusLabel[question.status]}</span>
              </td>
              <td>보기 {question.correctAnswerIndex + 1}</td>
              <td>{formatWrongRateSummary(question)}</td>
              <td>{formatDate(question.createdAt)}</td>
              <td>
                <button className="text-button" type="button" onClick={() => onEdit(question)}>
                  수정
                </button>
              </td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(question.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {questions.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={10}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
