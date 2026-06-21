import { useCallback, useEffect, useState } from 'react';
import { cohortApi, CohortApiItem, CohortPayload } from '../../../api/cohorts';
import { CohortForm, CohortFormValues } from '../../../components/admin/CohortForm';
import { CohortRow, CohortTable } from '../../../components/admin/CohortTable';
import { Pagination } from '../../../components/admin/Pagination';

const PAGE_SIZE = 5;
type ActiveFilter = 'all' | 'active' | 'inactive';

const getCohortStatus = (cohort: CohortApiItem): CohortRow['status'] => {
  const today = new Date().toISOString().slice(0, 10);

  if (today < cohort.startsOn) return 'planned';
  if (cohort.endsOn && today > cohort.endsOn) return 'completed';
  return 'active';
};

const toRow = (cohort: CohortApiItem): CohortRow => ({
  id: cohort.id,
  name: cohort.name,
  code: cohort.code,
  description: cohort.description ?? '',
  startsOn: cohort.startsOn,
  endsOn: cohort.endsOn,
  status: getCohortStatus(cohort),
  isActive: cohort.isActive,
  studentCount: cohort.studentCount,
  createdAt: cohort.createdAt,
  updatedAt: cohort.updatedAt,
  deletedAt: null,
});

const toFormValues = (cohort: CohortRow): CohortFormValues => ({
  name: cohort.name,
  code: cohort.code,
  description: cohort.description,
  startsOn: cohort.startsOn,
  endsOn: cohort.endsOn ?? '',
  status: cohort.status,
  studentCount: cohort.studentCount,
});

const toPayload = (values: CohortFormValues): CohortPayload => ({
  name: values.name,
  code: values.code,
  description: values.description || null,
  startsOn: values.startsOn,
  endsOn: values.endsOn || null,
  isActive: values.status !== 'completed',
});

export function CohortPage() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingCohort, setEditingCohort] = useState<CohortRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const loadCohorts = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await cohortApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        keyword,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
      });

      setCohorts(response.data.map(toRow));
      setTotalItems(response.meta.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기수 목록을 불러오지 못했습니다.');
      setCohorts([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, keyword, page]);

  useEffect(() => {
    void loadCohorts();
  }, [loadCohorts]);

  const closeForm = () => {
    setEditingCohort(null);
    setIsCreating(false);
  };

  const handleSearchChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleActiveFilterChange = (value: ActiveFilter) => {
    setActiveFilter(value);
    setPage(1);
  };

  const handleCreate = async (values: CohortFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await cohortApi.create(toPayload(values));
      closeForm();
      setPage(1);
      await loadCohorts(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기수를 생성하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (values: CohortFormValues) => {
    if (!editingCohort) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await cohortApi.update(editingCohort.id, toPayload(values));
      closeForm();
      await loadCohorts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기수를 수정하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cohortId: string) => {
    const target = cohorts.find((cohort) => cohort.id === cohortId);
    if (!target) return;

    const confirmed = window.confirm(`${target.name} 기수를 삭제할까요?`);
    if (!confirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await cohortApi.delete(cohortId);
      setPage(1);
      await loadCohorts(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기수를 삭제하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cohort-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Cohort Management</p>
          <h1>기수관리</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
          기수 추가
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="toolbar">
          <label className="search-field">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="기수명, 코드 검색"
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => handleSearchChange('')}>
            초기화
          </button>
          <label className="search-field">
            <span>활성 여부</span>
            <select
              value={activeFilter}
              onChange={(event) => handleActiveFilterChange(event.target.value as ActiveFilter)}
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </label>
        </div>

        {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}
        {isLoading ? <p className="table-subtitle">기수 목록을 불러오는 중입니다.</p> : null}

        <CohortTable cohorts={cohorts} onDelete={handleDelete} onEdit={setEditingCohort} />
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingCohort) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '기수 추가' : '기수 수정'}</h2>
              <p>입력한 내용은 저장 시 DB에 반영됩니다.</p>
            </div>
          </div>
          <CohortForm
            disabled={isSubmitting}
            initialValues={editingCohort ? toFormValues(editingCohort) : undefined}
            mode={isCreating ? 'create' : 'edit'}
            onCancel={closeForm}
            onSubmit={isCreating ? handleCreate : handleUpdate}
          />
        </section>
      )}
    </div>
  );
}
