import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { cohortApi, CohortApiItem } from '../../../api/cohorts';
import { workbookAssignmentApi, WorkbookAssignmentApiItem } from '../../../api/workbookAssignments';
import { workbookApi, WorkbookApiItem } from '../../../api/workbooks';
import { Pagination } from '../../../components/admin/Pagination';
import {
  AssignmentDisplayStatus,
  WorkbookAssignmentTable,
  WorkbookAssignmentTableRow,
} from '../../../components/admin/WorkbookAssignmentTable';
import { WorkbookStatusLabel } from '../../../constants/statusLabels';
import { AssignmentStatus } from '../../../types/domain';

const PAGE_SIZE = 8;
const OPTION_LIMIT = 100;

type AssignmentFormValues = {
  workbookId: string;
  workbookTitle: string;
  cohortId: string;
  opensOn: string;
  closesOn: string;
  maxAttempts: number;
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const defaultFormValues: AssignmentFormValues = {
  workbookId: '',
  workbookTitle: '',
  cohortId: '',
  opensOn: todayInputValue(),
  closesOn: todayInputValue(),
  maxAttempts: 1,
};

const toStartIso = (value: string) => `${value}T00:00:00.000Z`;
const toEndIso = (value: string) => `${value}T23:59:59.000Z`;
const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : '');

const getDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

const getAssignmentDisplayStatus = (opensAt: string, closesAt?: string | null): AssignmentDisplayStatus => {
  const today = getDateOnly(new Date());
  const startsOn = getDateOnly(new Date(opensAt));
  const endsOn = closesAt ? getDateOnly(new Date(closesAt)) : Number.POSITIVE_INFINITY;

  if (today < startsOn) return 'scheduled';
  if (today <= endsOn) return 'open';
  return 'closed';
};

const getApiStatus = (opensOn: string, closesOn: string): AssignmentStatus => {
  return getAssignmentDisplayStatus(toStartIso(opensOn), toEndIso(closesOn));
};

const toTableRow = (assignment: WorkbookAssignmentApiItem): WorkbookAssignmentTableRow => ({
  id: assignment.id,
  workbookTitle: assignment.workbook.title,
  cohortName: assignment.cohort.name,
  opensAt: assignment.opensAt,
  closesAt: assignment.closesAt,
  maxAttempts: assignment.maxAttempts,
  submissionCount: assignment.submissionCount ?? 0,
  apiStatus: assignment.status,
  displayStatus: getAssignmentDisplayStatus(assignment.opensAt, assignment.closesAt),
});

export function WorkbookAssignmentPage() {
  const [assignments, setAssignments] = useState<WorkbookAssignmentApiItem[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookApiItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortApiItem[]>([]);
  const [workbookId, setWorkbookId] = useState('all');
  const [cohortId, setCohortId] = useState('all');
  const [status, setStatus] = useState<AssignmentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AssignmentFormValues>(defaultFormValues);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionLoading, setIsOptionLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const assignmentTableRows = useMemo(() => assignments.map(toTableRow), [assignments]);
  const selectedWorkbook = workbooks.find((workbook) => workbook.id === formValues.workbookId) ?? null;
  const hasAssignableWorkbooks = workbooks.length > 0;

  const loadAssignments = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await workbookAssignmentApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        workbookId: workbookId === 'all' ? undefined : workbookId,
        cohortId: cohortId === 'all' ? undefined : cohortId,
        status: status === 'all' ? undefined : status,
      });

      setAssignments(response.data);
      setTotalItems(response.meta.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '배포 목록을 불러오지 못했습니다.');
      setAssignments([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [cohortId, page, status, workbookId]);

  const loadOptions = useCallback(async () => {
    setIsOptionLoading(true);
    setErrorMessage('');

    try {
      const [workbookResponse, cohortResponse] = await Promise.all([
        workbookApi.list({
          page: 1,
          limit: OPTION_LIMIT,
          status: 'published',
        }),
        cohortApi.list({
          page: 1,
          limit: OPTION_LIMIT,
        }),
      ]);
      const publishedWorkbooks = workbookResponse.data.filter((workbook) => workbook.status === 'published');

      setWorkbooks(publishedWorkbooks);
      setCohorts(cohortResponse.data);
      setFormValues((current) => ({
        ...current,
        workbookId: current.workbookId || publishedWorkbooks[0]?.id || '',
        workbookTitle:
          current.workbookTitle ||
          publishedWorkbooks.find((workbook) => workbook.id === current.workbookId)?.title ||
          publishedWorkbooks[0]?.title ||
          '',
        cohortId: current.cohortId || cohortResponse.data[0]?.id || '',
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문제집 또는 기수 목록을 불러오지 못했습니다.');
    } finally {
      setIsOptionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const openCreateForm = () => {
    setEditingAssignmentId(null);
    setFormValues({
      ...defaultFormValues,
      workbookId: workbooks[0]?.id ?? '',
      workbookTitle: workbooks[0]?.title ?? '',
      cohortId: cohorts[0]?.id ?? '',
    });
    setFormMode('create');
  };

  const openEditForm = async (assignment: WorkbookAssignmentTableRow) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await workbookAssignmentApi.get(assignment.id);
      setEditingAssignmentId(assignment.id);
      setFormValues({
        workbookId: response.data.workbook.id,
        workbookTitle: response.data.workbook.title,
        cohortId: response.data.cohort.id,
        opensOn: toDateInputValue(response.data.opensAt),
        closesOn: toDateInputValue(response.data.closesAt),
        maxAttempts: response.data.maxAttempts,
      });
      setFormMode('edit');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '배포 상세를 불러오지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeForm = () => {
    setEditingAssignmentId(null);
    setFormMode(null);
  };

  const handleWorkbookFilterChange = (value: string) => {
    setWorkbookId(value);
    setPage(1);
  };

  const handleCohortFilterChange = (value: string) => {
    setCohortId(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: AssignmentStatus | 'all') => {
    setStatus(value);
    setPage(1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.workbookId || !formValues.cohortId || !formValues.opensOn || !formValues.closesOn) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        status: getApiStatus(formValues.opensOn, formValues.closesOn),
        opensAt: toStartIso(formValues.opensOn),
        closesAt: toEndIso(formValues.closesOn),
        maxAttempts: Math.max(1, formValues.maxAttempts),
      };

      if (formMode === 'create') {
        await workbookAssignmentApi.create(formValues.workbookId, {
          ...payload,
          cohortId: formValues.cohortId,
        });
        closeForm();
        setPage(1);
        await loadAssignments(1);
        return;
      }

      if (!editingAssignmentId) return;

      await workbookAssignmentApi.update(editingAssignmentId, payload);
      closeForm();
      await loadAssignments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '배포 정보를 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    const confirmed = window.confirm('선택한 배포를 삭제할까요?');
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await workbookAssignmentApi.delete(assignmentId);
      setPage(1);
      await loadAssignments(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '배포를 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cohort-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Workbook Assignment</p>
          <h1>문제집 기수 배포</h1>
        </div>
        <button
          className="primary-button"
          disabled={isSubmitting || !hasAssignableWorkbooks || cohorts.length === 0}
          type="button"
          onClick={openCreateForm}
        >
          배포 추가
        </button>
      </section>

      {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}
      {!hasAssignableWorkbooks ? (
        <p className="table-subtitle">배포 가능한 문제집이 없습니다. 문제집을 사용중 상태로 변경해주세요.</p>
      ) : null}

      {formMode ? (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{formMode === 'create' ? '배포 생성' : '배포 수정'}</h2>
              <p>문제집, 기수, 기간, 최대 응시 횟수를 설정합니다.</p>
            </div>
            {selectedWorkbook ? (
              <div className="workbook-summary">
                <strong>{selectedWorkbook.questionCount ?? 0}문항</strong>
                <span className={`status-pill status-${selectedWorkbook.status}`}>
                  {WorkbookStatusLabel[selectedWorkbook.status]}
                </span>
              </div>
            ) : null}
          </div>

          <form className="cohort-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                <span>문제집</span>
                {formMode === 'edit' ? (
                  <input disabled value={formValues.workbookTitle || '문제집 정보 없음'} />
                ) : (
                  <select
                    disabled={isSubmitting || !hasAssignableWorkbooks}
                    value={formValues.workbookId}
                    onChange={(event) => {
                      const workbook = workbooks.find((item) => item.id === event.target.value);
                      setFormValues((current) => ({
                        ...current,
                        workbookId: event.target.value,
                        workbookTitle: workbook?.title ?? '',
                      }));
                    }}
                  >
                    {workbooks.map((workbook) => (
                      <option key={workbook.id} value={workbook.id}>
                        {workbook.title}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label>
                <span>기수</span>
                <select
                  disabled={isSubmitting || formMode === 'edit'}
                  value={formValues.cohortId}
                  onChange={(event) => setFormValues((current) => ({ ...current, cohortId: event.target.value }))}
                >
                  {cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>시작일</span>
                <input
                  disabled={isSubmitting}
                  required
                  type="date"
                  value={formValues.opensOn}
                  onChange={(event) => setFormValues((current) => ({ ...current, opensOn: event.target.value }))}
                />
              </label>

              <label>
                <span>종료일</span>
                <input
                  disabled={isSubmitting}
                  required
                  type="date"
                  value={formValues.closesOn}
                  onChange={(event) => setFormValues((current) => ({ ...current, closesOn: event.target.value }))}
                />
              </label>

              <label>
                <span>최대 응시 횟수</span>
                <input
                  disabled={isSubmitting}
                  min={1}
                  required
                  type="number"
                  value={formValues.maxAttempts}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, maxAttempts: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="secondary-button" disabled={isSubmitting} type="button" onClick={closeForm}>
                취소
              </button>
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? '저장 중...' : formMode === 'create' ? '배포 생성' : '수정 저장'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>배포 목록</h2>
            <p>문제집과 기수 기준으로 배포 현황을 확인합니다.</p>
          </div>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span>문제집</span>
            <select value={workbookId} onChange={(event) => handleWorkbookFilterChange(event.target.value)}>
              <option value="all">전체 문제집</option>
              {workbooks.map((workbook) => (
                <option key={workbook.id} value={workbook.id}>
                  {workbook.title}
                </option>
              ))}
            </select>
          </label>

          <label className="search-field">
            <span>기수</span>
            <select value={cohortId} onChange={(event) => handleCohortFilterChange(event.target.value)}>
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
            <select
              value={status}
              onChange={(event) => handleStatusFilterChange(event.target.value as AssignmentStatus | 'all')}
            >
              <option value="all">전체 상태</option>
              <option value="scheduled">예정</option>
              <option value="open">진행중</option>
              <option value="closed">종료</option>
            </select>
          </label>
        </div>

        {isLoading || isOptionLoading ? <p className="table-subtitle">배포 데이터를 불러오는 중입니다.</p> : null}

        <WorkbookAssignmentTable
          assignments={assignmentTableRows}
          disabled={isSubmitting}
          onDelete={handleDelete}
          onEdit={openEditForm}
        />
        <Pagination currentPage={currentPage} totalItems={totalItems} totalPages={totalPages} onPageChange={setPage} />
      </section>
    </div>
  );
}
