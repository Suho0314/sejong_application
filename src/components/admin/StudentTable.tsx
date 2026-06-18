import { StudentStatus } from '../../types/domain';

export type StudentRow = {
  id: string;
  userId: string;
  cohortId: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  studentNo: string;
  status: StudentStatus;
  enrolledAt: string;
  enrolledOn: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type StudentTableCohort = {
  id: string;
  name: string;
};

type StudentTableProps = {
  cohorts: StudentTableCohort[];
  students: StudentRow[];
  onDelete: (studentId: string) => void;
  onEdit: (student: StudentRow) => void;
};

const statusLabels: Record<StudentStatus, string> = {
  active: '재원',
  inactive: '비활성',
  graduated: '수료',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

export function StudentTable({ cohorts, students, onDelete, onEdit }: StudentTableProps) {
  const cohortMap = new Map(cohorts.map((cohort) => [cohort.id, cohort.name]));

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
                  {student.studentNo} · {student.email}
                </span>
              </td>
              <td>{cohortMap.get(student.cohortId) ?? '-'}</td>
              <td>{student.phone || '-'}</td>
              <td>
                <span className={`status-pill status-${student.status}`}>{statusLabels[student.status]}</span>
              </td>
              <td>{formatDate(student.enrolledAt)}</td>
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
              <td className="empty-cell" colSpan={7}>
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
