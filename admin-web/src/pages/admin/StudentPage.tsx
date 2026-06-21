import { useCallback, useEffect, useState } from 'react';
import { cohortApi } from '../../api/cohorts';
import { studentApi, StudentApiItem, UpdateStudentPayload } from '../../api/students';
import { Pagination } from '../../components/admin/Pagination';
import { StudentForm, StudentFormValues } from '../../components/admin/StudentForm';
import { StudentRow, StudentTable } from '../../components/admin/StudentTable';
import { StudentStatus } from '../../types/domain';

const PAGE_SIZE = 5;
const DEFAULT_STUDENT_PASSWORD = 'student-1234';

type CohortOption = {
  id: string;
  name: string;
};

type StatusFilter = 'all' | StudentStatus;

const toRow = (student: StudentApiItem): StudentRow => ({
  id: student.id,
  userId: student.userId,
  cohortId: student.cohortId,
  name: student.name,
  email: student.email ?? '',
  phone: student.phone ?? '',
  birthDate: undefined,
  studentNo: student.studentNo ?? '',
  status: student.status,
  enrolledAt: student.enrolledOn,
  enrolledOn: student.enrolledOn,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
  deletedAt: null,
});

const toFormValues = (student: StudentRow): StudentFormValues => ({
  name: student.name,
  email: student.email,
  phone: student.phone ?? '',
  studentNo: student.studentNo,
  cohortId: student.cohortId,
  birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
  status: student.status,
  enrolledOn: student.enrolledOn,
});

const toPayload = (values: StudentFormValues): UpdateStudentPayload => ({
  name: values.name,
  loginId: values.studentNo,
  email: values.email || null,
  phone: values.phone || null,
  cohortId: values.cohortId,
  studentNo: values.studentNo,
  status: values.status,
  enrolledOn: values.enrolledOn,
  completedOn: values.status === 'graduated' ? values.enrolledOn : null,
  memo: null,
});

export function StudentPage() {
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [cohortId, setCohortId] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const loadCohorts = useCallback(async () => {
    const response = await cohortApi.list({
      page: 1,
      limit: 100,
    });

    setCohorts(response.data.map((cohort) => ({ id: cohort.id, name: cohort.name })));
  }, []);

  const loadStudents = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await studentApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        keyword,
        cohortId: cohortId === 'all' ? undefined : cohortId,
        status: status === 'all' ? undefined : status,
      });

      setStudents(response.data.map(toRow));
      setTotalItems(response.meta.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생 목록을 불러오지 못했습니다.');
      setStudents([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, keyword, page, status]);

  useEffect(() => {
    loadCohorts().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : '기수 목록을 불러오지 못했습니다.');
    });
  }, [loadCohorts]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

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

  const handleStatusChange = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const resetFilters = () => {
    setKeyword('');
    setCohortId('all');
    setStatus('all');
    setPage(1);
  };

  const handleCreate = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.create({
        ...toPayload(values),
        password: DEFAULT_STUDENT_PASSWORD,
      });
      closeForm();
      setPage(1);
      await loadStudents(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생을 생성하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: StudentFormValues) => {
    if (!editingStudent) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.update(editingStudent.id, toPayload(values));
      closeForm();
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생을 수정하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    const target = students.find((student) => student.id === studentId);
    if (!target) return;

    const confirmed = window.confirm(`${target.name} 학생을 삭제할까요?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.delete(studentId);
      setPage(1);
      await loadStudents(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생을 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
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
              placeholder="이름, 이메일, 연락처, 학번 검색"
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
          <label className="search-field">
            <span>상태</span>
            <select value={status} onChange={(event) => handleStatusChange(event.target.value as StatusFilter)}>
              <option value="all">전체 상태</option>
              <option value="active">재원</option>
              <option value="paused">휴원</option>
              <option value="inactive">휴면</option>
              <option value="graduated">수료</option>
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={resetFilters}>
            초기화
          </button>
        </div>

        {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}
        {isLoading ? <p className="table-subtitle">학생 목록을 불러오는 중입니다.</p> : null}

        <StudentTable cohorts={cohorts} students={students} onDelete={handleDelete} onEdit={setEditingStudent} />
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingStudent) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '학생 추가' : '학생 수정'}</h2>
              <p>학생 정보와 소속 기수는 저장 시 DB에 반영됩니다.</p>
            </div>
          </div>
          <StudentForm
            cohorts={cohorts}
            disabled={isSubmitting}
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
