import { useMemo, useState } from 'react';
import { Pagination } from '../../components/admin/Pagination';
import { StudentForm, StudentFormValues } from '../../components/admin/StudentForm';
import { StudentRow, StudentTable } from '../../components/admin/StudentTable';
import cohortsData from '../../mock/cohorts.json';
import studentsData from '../../mock/students.json';

const PAGE_SIZE = 5;

type CohortOption = {
  id: string;
  name: string;
};

const formatDateOnly = (value: string) => value.slice(0, 10);

const createId = (studentNo: string) =>
  `student-${studentNo
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now()}`;

const toFormValues = (student: StudentRow): StudentFormValues => ({
  name: student.name,
  email: student.email,
  phone: student.phone ?? '',
  studentNo: student.studentNo,
  cohortId: student.cohortId,
  birthDate: student.birthDate ? formatDateOnly(student.birthDate) : '',
  status: student.status,
  enrolledOn: student.enrolledOn || formatDateOnly(student.enrolledAt),
});

export function StudentPage() {
  const cohorts = cohortsData as CohortOption[];
  const [students, setStudents] = useState<StudentRow[]>(studentsData as StudentRow[]);
  const [keyword, setKeyword] = useState('');
  const [cohortId, setCohortId] = useState('all');
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredStudents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return students.filter((student) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [student.name, student.email, student.phone ?? '', student.studentNo].some((value) =>
          value.toLowerCase().includes(normalizedKeyword),
        );
      const matchesCohort = cohortId === 'all' || student.cohortId === cohortId;

      return matchesKeyword && matchesCohort;
    });
  }, [cohortId, keyword, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const closeForm = () => {
    setEditingStudent(null);
    setIsCreating(false);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleCohortChange = (value: string) => {
    setCohortId(value);
    setPage(1);
  };

  const handleCreate = (values: StudentFormValues) => {
    const now = new Date().toISOString();
    const enrolledAt = new Date(values.enrolledOn).toISOString();
    const nextStudent: StudentRow = {
      id: createId(values.studentNo),
      userId: `user-${createId(values.studentNo)}`,
      cohortId: values.cohortId,
      name: values.name,
      email: values.email,
      phone: values.phone,
      birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : undefined,
      studentNo: values.studentNo,
      status: values.status,
      enrolledAt,
      enrolledOn: values.enrolledOn,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    setStudents((current) => [nextStudent, ...current]);
    setPage(1);
    closeForm();
  };

  const handleUpdate = (values: StudentFormValues) => {
    if (!editingStudent) return;

    setStudents((current) =>
      current.map((student) =>
        student.id === editingStudent.id
          ? {
              ...student,
              cohortId: values.cohortId,
              name: values.name,
              email: values.email,
              phone: values.phone,
              birthDate: values.birthDate ? new Date(values.birthDate).toISOString() : undefined,
              studentNo: values.studentNo,
              status: values.status,
              enrolledAt: new Date(values.enrolledOn).toISOString(),
              enrolledOn: values.enrolledOn,
              updatedAt: new Date().toISOString(),
            }
          : student,
      ),
    );
    closeForm();
  };

  const handleDelete = (studentId: string) => {
    const target = students.find((student) => student.id === studentId);
    if (!target) return;

    const confirmed = window.confirm(`${target.name} 학생을 삭제할까요? Mock Data 화면에서만 제거됩니다.`);
    if (!confirmed) return;

    setStudents((current) => current.filter((student) => student.id !== studentId));
    setPage(1);
  };

  return (
    <div className="cohort-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Student Management</p>
          <h1>학생관리</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
          학생 추가
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="toolbar">
          <label className="search-field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="이름, 이메일, 연락처, 학생번호 검색"
            />
          </label>
          <label className="search-field">
            <span>기수</span>
            <select value={cohortId} onChange={(event) => handleCohortChange(event.target.value)}>
              <option value="all">전체 기수</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              handleKeywordChange('');
              handleCohortChange('all');
            }}
          >
            초기화
          </button>
        </div>

        <StudentTable cohorts={cohorts} students={pageItems} onDelete={handleDelete} onEdit={setEditingStudent} />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStudents.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingStudent) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '학생 추가' : '학생 수정'}</h2>
              <p>학생 정보와 소속 기수를 관리합니다. Mock Data 화면 상태에서만 반영됩니다.</p>
            </div>
          </div>
          <StudentForm
            cohorts={cohorts}
            initialValues={editingStudent ? toFormValues(editingStudent) : undefined}
            mode={isCreating ? 'create' : 'edit'}
            onCancel={closeForm}
            onSubmit={isCreating ? handleCreate : handleUpdate}
          />
        </section>
      )}
    </div>
  );
}
