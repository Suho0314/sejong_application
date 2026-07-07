import { CohortStatus } from './CohortForm';

export type CohortRow = {
  id: string;
  name: string;
  code: string;
  description: string;
  startsOn: string;
  endsOn: string | null;
  status: CohortStatus;
  isActive: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type CohortTableProps = {
  cohorts: CohortRow[];
  onDelete: (cohortId: string) => void;
  onEdit: (cohort: CohortRow) => void;
};

const statusLabels: Record<CohortStatus, string> = {
  planned: '예정',
  active: '진행중',
  completed: '완료',
};

const formatDate = (value: string | null) => {
  if (!value) return '-';

  return value.replace(/-/g, '.');
};

const formatPeriod = (startsOn: string, endsOn: string | null) =>
  `${formatDate(startsOn)} ~ ${formatDate(endsOn)}`;

export function CohortTable({ cohorts, onDelete, onEdit }: CohortTableProps) {
  return (
    <div className="table-wrap">
      <table className="cohort-table">
        <thead>
          <tr>
            <th>기수명</th>
            <th className="cohort-period-cell">기간</th>
            <th className="cohort-student-count">학생수</th>
            <th>상태</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.id}>
              <td>
                <div className="table-title">{cohort.name}</div>
                <span className="table-subtitle">
                  {cohort.code} · {cohort.description}
                </span>
              </td>
              <td className="cohort-period-cell">{formatPeriod(cohort.startsOn, cohort.endsOn)}</td>
              <td className="cohort-student-count">{cohort.studentCount.toLocaleString('ko-KR')}명</td>
              <td>
                <span className={`status-pill status-${cohort.status}`}>{statusLabels[cohort.status]}</span>
              </td>
              <td>
                <button className="text-button" type="button" onClick={() => onEdit(cohort)}>
                  수정
                </button>
              </td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(cohort.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {cohorts.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={6}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
