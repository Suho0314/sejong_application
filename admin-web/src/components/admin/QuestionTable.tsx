import { CSSProperties } from 'react';
import { QuestionStatusLabel } from '../../constants/statusLabels';
import { ContentStatus, Difficulty, QuestionType } from '../../types/domain';

export type QuestionRow = {
  id: string;
  subject: string;
  category?: string;
  difficulty: Difficulty;
  type: QuestionType;
  content: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type QuestionTableProps = {
  questions: QuestionRow[];
  onDelete: (questionId: string) => void;
  onEdit: (question: QuestionRow) => void;
};

const difficultyLabels: Record<Difficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
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

export function QuestionTable({ questions, onDelete, onEdit }: QuestionTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제</th>
            <th>과목</th>
            <th>카테고리</th>
            <th>난이도</th>
            <th>상태</th>
            <th>정답</th>
            <th>생성일</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <td>
                <div className="table-title" style={contentPreviewStyle}>
                  {question.content}
                </div>
                <span className="table-subtitle">
                  {question.subject} │ {question.category || '미분류'} │ {difficultyLabels[question.difficulty]} │{' '}
                  {QuestionStatusLabel[question.status]}
                </span>
              </td>
              <td>{question.subject}</td>
              <td>{question.category || '-'}</td>
              <td>{difficultyLabels[question.difficulty]}</td>
              <td>
                <span className={`status-pill status-${question.status}`}>{QuestionStatusLabel[question.status]}</span>
              </td>
              <td>보기 {question.correctAnswerIndex + 1}</td>
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
              <td className="empty-cell" colSpan={9}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
