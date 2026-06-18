import { useMemo, useState } from 'react';
import { CohortForm, CohortFormValues } from '../../components/admin/CohortForm';
import { CohortRow, CohortTable } from '../../components/admin/CohortTable';
import { Pagination } from '../../components/admin/Pagination';
import cohortsData from '../../mock/cohorts.json';

const PAGE_SIZE = 5;

const createId = (name: string) =>
  `cohort-${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')}-${Date.now()}`;

const toFormValues = (cohort: CohortRow): CohortFormValues => ({
  name: cohort.name,
  code: cohort.code,
  description: cohort.description,
  startsOn: cohort.startsOn,
  endsOn: cohort.endsOn ?? '',
  status: cohort.status,
  studentCount: cohort.studentCount,
});

export function CohortPage() {
  const [cohorts, setCohorts] = useState<CohortRow[]>(cohortsData as CohortRow[]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editingCohort, setEditingCohort] = useState<CohortRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredCohorts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) return cohorts;

    return cohorts.filter((cohort) =>
      [cohort.name, cohort.code, cohort.description, cohort.status].some((value) =>
        value.toLowerCase().includes(normalizedKeyword),
      ),
    );
  }, [cohorts, keyword]);

  const totalPages = Math.max(1, Math.ceil(filteredCohorts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredCohorts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const closeForm = () => {
    setEditingCohort(null);
    setIsCreating(false);
  };

  const handleCreate = (values: CohortFormValues) => {
    const now = new Date().toISOString();
    const nextCohort: CohortRow = {
      id: createId(values.name),
      name: values.name,
      code: values.code,
      description: values.description,
      startsOn: values.startsOn,
      endsOn: values.endsOn || null,
      status: values.status,
      isActive: values.status !== 'completed',
      studentCount: values.studentCount,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    setCohorts((current) => [nextCohort, ...current]);
    setPage(1);
    closeForm();
  };

  const handleUpdate = (values: CohortFormValues) => {
    if (!editingCohort) return;

    setCohorts((current) =>
      current.map((cohort) =>
        cohort.id === editingCohort.id
          ? {
              ...cohort,
              name: values.name,
              code: values.code,
              description: values.description,
              startsOn: values.startsOn,
              endsOn: values.endsOn || null,
              status: values.status,
              isActive: values.status !== 'completed',
              studentCount: values.studentCount,
              updatedAt: new Date().toISOString(),
            }
          : cohort,
      ),
    );
    closeForm();
  };

  const handleDelete = (cohortId: string) => {
    const target = cohorts.find((cohort) => cohort.id === cohortId);
    if (!target) return;

    const confirmed = window.confirm(`${target.name} 기수를 삭제할까요? Mock Data 화면에서만 제거됩니다.`);
    if (!confirmed) return;

    setCohorts((current) => current.filter((cohort) => cohort.id !== cohortId));
    setPage(1);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(1);
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
              onChange={(event) => handleKeywordChange(event.target.value)}
              placeholder="기수명, 코드, 설명, 상태 검색"
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => handleKeywordChange('')}>
            초기화
          </button>
        </div>

        <CohortTable cohorts={pageItems} onDelete={handleDelete} onEdit={setEditingCohort} />
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCohorts.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      {(isCreating || editingCohort) && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>{isCreating ? '기수 추가' : '기수 수정'}</h2>
              <p>Mock Data 화면 상태에서만 반영됩니다.</p>
            </div>
          </div>
          <CohortForm
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
