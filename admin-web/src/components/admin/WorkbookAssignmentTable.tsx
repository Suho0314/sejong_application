import { AssignmentStatus } from '../../types/domain';

export type AssignmentDisplayStatus = 'scheduled' | 'open' | 'closed';

export type WorkbookAssignmentTableRow = {
  id: string;
  workbookTitle: string;
  cohortName: string;
  opensAt: string;
  closesAt?: string | null;
  maxAttempts: number;
  submissionCount: number;
  apiStatus: AssignmentStatus;
  displayStatus: AssignmentDisplayStatus;
};

type WorkbookAssignmentTableProps = {
  assignments: WorkbookAssignmentTableRow[];
  disabled?: boolean;
  onDelete: (assignmentId: string) => void;
  onEdit: (assignment: WorkbookAssignmentTableRow) => void;
};

const statusLabels: Record<AssignmentDisplayStatus, string> = {
  scheduled: '예정',
  open: '진행중',
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

export function WorkbookAssignmentTable({
  assignments,
  disabled = false,
  onDelete,
  onEdit,
}: WorkbookAssignmentTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>문제집명</th>
            <th>기수명</th>
            <th>시작일</th>
            <th>종료일</th>
            <th>응시인원</th>
            <th>상태</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td>
                <div className="table-title">{assignment.workbookTitle}</div>
                <span className="table-subtitle">최대 {assignment.maxAttempts}회 응시</span>
              </td>
              <td>
                <div className="table-title">{assignment.cohortName}</div>
              </td>
              <td>{formatDate(assignment.opensAt)}</td>
              <td>{formatDate(assignment.closesAt)}</td>
              <td>{assignment.submissionCount.toLocaleString('ko-KR')}명</td>
              <td>
                <span className={`status-pill status-${assignment.displayStatus}`}>
                  {statusLabels[assignment.displayStatus]}
                </span>
              </td>
              <td>
                <button className="text-button" disabled={disabled} type="button" onClick={() => onEdit(assignment)}>
                  수정
                </button>
              </td>
              <td>
                <button className="danger-button" disabled={disabled} type="button" onClick={() => onDelete(assignment.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {assignments.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={8}>
                배포 이력이 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
