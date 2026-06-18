import { AssignmentStatus } from '../../types/domain';

export type WorkbookAssignmentTableRow = {
  id: string;
  workbookTitle: string;
  cohortName: string;
  cohortCode: string;
  assignedAt: string;
  dueDate?: string | null;
  status: AssignmentStatus;
};

type WorkbookAssignmentTableProps = {
  assignments: WorkbookAssignmentTableRow[];
  onCancel: (assignmentId: string) => void;
};

const statusLabels: Record<AssignmentStatus, string> = {
  active: '배포중',
  closed: '종료',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

export function WorkbookAssignmentTable({ assignments, onCancel }: WorkbookAssignmentTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제집</th>
            <th>기수</th>
            <th>상태</th>
            <th>배포일</th>
            <th>마감일</th>
            <th>배포 취소</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td>
                <div className="table-title">{assignment.workbookTitle}</div>
              </td>
              <td>
                <div className="table-title">{assignment.cohortName}</div>
                <span className="table-subtitle">{assignment.cohortCode}</span>
              </td>
              <td>
                <span className={`status-pill status-${assignment.status}`}>{statusLabels[assignment.status]}</span>
              </td>
              <td>{formatDate(assignment.assignedAt)}</td>
              <td>{formatDate(assignment.dueDate)}</td>
              <td>
                <button
                  className="danger-button"
                  disabled={assignment.status === 'closed'}
                  type="button"
                  onClick={() => onCancel(assignment.id)}
                >
                  취소
                </button>
              </td>
            </tr>
          ))}
          {assignments.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={6}>
                배포 이력이 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
