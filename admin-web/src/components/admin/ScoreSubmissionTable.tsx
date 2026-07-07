import { SubmissionStatus } from '../../types/domain';

export type ScoreSubmissionRow = {
  id: string;
  studentName: string;
  studentNo?: string;
  cohortName: string;
  workbookTitle: string;
  score: number;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  status: SubmissionStatus;
  submittedAt?: string | null;
};

type ScoreSubmissionTableProps = {
  submissions: ScoreSubmissionRow[];
  onViewDetail: (submissionId: string) => void;
};

const statusLabels: Record<SubmissionStatus, string> = {
  in_progress: '진행중',
  submitted: '제출완료',
  graded: '채점완료',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

export function ScoreSubmissionTable({ submissions, onViewDetail }: ScoreSubmissionTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>학생</th>
            <th>기수</th>
            <th>문제집</th>
            <th>점수</th>
            <th>정답/오답</th>
            <th>상태</th>
            <th>제출일</th>
            <th>오답 보기</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <td>
                <div className="table-title">{submission.studentName}</div>
                <span className="table-subtitle">{submission.studentNo ?? '-'}</span>
              </td>
              <td>{submission.cohortName}</td>
              <td>{submission.workbookTitle}</td>
              <td>
                <strong>
                  {submission.score}/{submission.totalScore}
                </strong>
              </td>
              <td>
                {submission.correctCount}개 / {submission.wrongCount}개
              </td>
              <td>
                <span className={`status-pill status-${submission.status}`}>{statusLabels[submission.status]}</span>
              </td>
              <td>{formatDate(submission.submittedAt)}</td>
              <td>
                <button className="text-button" type="button" onClick={() => onViewDetail(submission.id)}>
                  오답 보기
                </button>
              </td>
            </tr>
          ))}
          {submissions.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={8}>
                조건에 맞는 성적이 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
