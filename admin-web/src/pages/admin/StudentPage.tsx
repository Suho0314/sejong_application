import { useCallback, useEffect, useState } from 'react';
import { cohortApi } from '../../api/cohorts';
import { studentApi, StudentApiItem, UpdateStudentPayload } from '../../api/students';
import { Pagination } from '../../components/admin/Pagination';
import { StudentForm, StudentFormValues } from '../../components/admin/StudentForm';
import { StudentRow, StudentTable } from '../../components/admin/StudentTable';
import { StudentStatus } from '../../types/domain';

const PAGE_SIZE = 5;

type CohortOption = {
  id: string;
  name: string;
};

type StatusFilter = 'all' | StudentStatus;

const toRow = (student: StudentApiItem): StudentRow => {
  const displayEnrolledOn = student.enrolledOn ?? student.createdAt;

  return {
    id: student.id,
    userId: student.userId,
    cohortId: student.cohortId,
    name: student.name,
    email: student.email ?? '',
    phone: student.phone ?? '',
    birthDate: undefined,
    studentNo: student.studentNo ?? '',
    status: student.status,
    enrolledAt: displayEnrolledOn,
    enrolledOn: displayEnrolledOn,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    deletedAt: null,
  };
};

const toFormValues = (student: StudentRow): StudentFormValues => ({
  name: student.name,
  email: student.email,
  phone: student.phone ?? '',
  studentNo: student.studentNo,
  cohortId: student.cohortId ?? '',
  birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
  status: student.status,
  enrolledOn: student.enrolledOn ?? '',
});

const toPayload = (values: StudentFormValues): UpdateStudentPayload => ({
  name: values.name,
  loginId: values.studentNo,
  email: values.email || null,
  phone: values.phone || null,
  cohortId: values.cohortId || null,
  studentNo: values.studentNo,
  status: values.status,
  enrolledOn: values.enrolledOn,
  completedOn: null,
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
  const [approvalCohortIds, setApprovalCohortIds] = useState<Record<string, string>>({});
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

  const handleApprovalCohortChange = (studentId: string, nextCohortId: string) => {
    setApprovalCohortIds((current) => ({
      ...current,
      [studentId]: nextCohortId,
    }));
  };

  const handleApprove = async (studentId: string) => {
    const cohortIdToApprove = approvalCohortIds[studentId] ?? cohorts[0]?.id;

    if (!cohortIdToApprove) {
      setErrorMessage('승인할 기수를 먼저 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.approve(studentId, cohortIdToApprove);
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생을 승인하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (studentId: string) => {
    const target = students.find((student) => student.id === studentId);
    if (!target) return;
    if (!window.confirm(`${target.name} 학생의 가입을 거절할까요?`)) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.reject(studentId);
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생 가입을 거절하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspend = async (studentId: string) => {
    const target = students.find((student) => student.id === studentId);
    if (!target) return;
    if (!window.confirm(`${target.name} 학생을 이용 중지할까요?`)) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await studentApi.suspend(studentId);
      await loadStudents();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '학생을 이용 중지하지 못했습니다.');
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
          <p className="table-subtitle">학생은 카카오 로그인 후 승인대기 상태로 등록됩니다.</p>
        </div>
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
              <option value="pending">승인대기</option>
              <option value="approved">승인완료</option>
              <option value="rejected">승인거절</option>
              <option value="suspended">이용중지</option>
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={resetFilters}>
            초기화
          </button>
        </div>

        {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}
        {isLoading ? <p className="table-subtitle">학생 목록을 불러오는 중입니다.</p> : null}

        <StudentTable
          approvalCohortIds={approvalCohortIds}
          cohorts={cohorts}
          students={students}
          onApprovalCohortChange={handleApprovalCohortChange}
          onApprove={handleApprove}
          onDelete={handleDelete}
          onEdit={setEditingStudent}
          onReject={handleReject}
          onSuspend={handleSuspend}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {editingStudent && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>학생 수정</h2>
              <p>학생 상태와 소속 기수는 저장 시 DB에 반영됩니다.</p>
            </div>
          </div>
          <StudentForm
            cohorts={cohorts}
            disabled={isSubmitting}
            initialValues={editingStudent ? toFormValues(editingStudent) : undefined}
            mode="edit"
            onCancel={closeForm}
            onSubmit={handleUpdate}
          />
        </section>
      )}
    </div>
  );
}
