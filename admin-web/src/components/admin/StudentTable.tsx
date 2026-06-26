import { StudentStatus } from '../../types/domain';

export type StudentRow = {
  id: string;
  userId: string;
  cohortId: string | null;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  studentNo: string;
  status: StudentStatus;
  enrolledAt: string | null;
  enrolledOn: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type StudentTableCohort = {
  cohortId: string;
  cohortName: string;
};

type StudentTableProps = {
  cohorts: StudentTableCohort[];
  students: StudentRow[];
  approvalCohortIds: Record<string, string>;
  onApprovalCohortChange: (studentId: string, cohortId: string) => void;
  onApprove: (studentId: string) => void;
  onDelete: (studentId: string) => void;
  onEdit: (student: StudentRow) => void;
  onReject: (studentId: string) => void;
  onSuspend: (studentId: string) => void;
};

const statusLabels: Record<StudentStatus, string> = {
  pending: '승인대기',
  approved: '승인완료',
  rejected: '승인거절',
  suspended: '이용중지',
};

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value)) : '-';

export function StudentTable({
  approvalCohortIds,
  cohorts,
  students,
  onApprovalCohortChange,
  onApprove,
  onDelete,
  onEdit,
  onReject,
  onSuspend,
}: StudentTableProps) {
  const cohortMap = new Map(cohorts.map((cohort) => [cohort.cohortId, cohort.cohortName]));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>학생</th>
            <th>소속 기수</th>
            <th>연락처</th>
            <th>상태</th>
            <th>등록일</th>
            <th>승인 처리</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td>
                <div className="table-title">{student.name}</div>
                <span className="table-subtitle">
                  {student.studentNo || '-'} · {student.email || '-'}
                </span>
              </td>
              <td>{student.cohortId ? cohortMap.get(student.cohortId) ?? '-' : '미배정'}</td>
              <td>{student.phone || '-'}</td>
              <td>
                <span className={`status-pill status-${student.status}`}>{statusLabels[student.status]}</span>
              </td>
              <td>{formatDate(student.enrolledOn)}</td>
              <td>
                {student.status === 'pending' ? (
                  <div className="inline-action-group">
                    <select
                      value={approvalCohortIds[student.id] ?? cohorts[0]?.cohortId ?? ''}
                      onChange={(event) => onApprovalCohortChange(student.id, event.target.value)}
                    >
                      {cohorts.map((cohort) => (
                        <option key={cohort.cohortId} value={cohort.cohortId}>
                          {cohort.cohortName}
                        </option>
                      ))}
                    </select>
                    <button className="text-button" type="button" onClick={() => onApprove(student.id)}>
                      승인
                    </button>
                    <button className="danger-button" type="button" onClick={() => onReject(student.id)}>
                      거절
                    </button>
                  </div>
                ) : student.status === 'approved' ? (
                  <button className="danger-button" type="button" onClick={() => onSuspend(student.id)}>
                    이용 중지
                  </button>
                ) : (
                  '-'
                )}
              </td>
              <td>
                <button className="text-button" type="button" onClick={() => onEdit(student)}>
                  수정
                </button>
              </td>
              <td>
                <button className="danger-button" type="button" onClick={() => onDelete(student.id)}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
          {students.length === 0 ? (
            <tr>
              <td className="empty-cell" colSpan={8}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
