import { useMemo, useState } from 'react';
import {
  WorkbookAssignmentTable,
  WorkbookAssignmentTableRow,
} from '../../../components/admin/WorkbookAssignmentTable';
import cohortsData from '../../../mock/cohorts.json';
import workbookAssignmentsData from '../../../mock/workbookAssignments.json';
import workbooksData from '../../../mock/workbooks.json';
import { AssignmentStatus, CohortStatus, ContentStatus } from '../../../types/domain';

type WorkbookRow = {
  id: string;
  title: string;
  description?: string;
  status: ContentStatus;
  questionCount?: number;
  totalPoints?: number;
};

type CohortRow = {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: CohortStatus;
  studentCount: number;
};

type WorkbookAssignmentRow = {
  id: string;
  workbookId: string;
  cohortId: string;
  assignedBy: string;
  assignedAt: string;
  dueDate?: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
};

const workbooks = workbooksData.map((workbook) => ({
  id: workbook.id,
  title: workbook.title,
  description: workbook.description,
  status: workbook.status as ContentStatus,
  questionCount: workbook.questionCount,
  totalPoints: workbook.totalPoints,
})) satisfies WorkbookRow[];

const cohorts = cohortsData.map((cohort) => ({
  id: cohort.id,
  name: cohort.name,
  code: cohort.code,
  description: cohort.description,
  status: cohort.status as CohortStatus,
  studentCount: cohort.studentCount,
})) satisfies CohortRow[];

const initialAssignments = workbookAssignmentsData as WorkbookAssignmentRow[];

const workbookStatusLabels: Record<ContentStatus, string> = {
  draft: '초안',
  published: '게시',
  archived: '보관',
};

const cohortStatusLabels: Record<CohortStatus, string> = {
  planned: '예정',
  active: '진행중',
  completed: '완료',
};

const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  active: '배포중',
  closed: '종료',
};

const toDateInputValue = (value: Date) => value.toISOString().slice(0, 10);

const toDueDate = (value: string) => (value ? `${value}T14:59:59.000Z` : null);

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

export function WorkbookAssignmentPage() {
  const [assignments, setAssignments] = useState<WorkbookAssignmentRow[]>(initialAssignments);
  const [selectedWorkbookId, setSelectedWorkbookId] = useState(workbooks[0]?.id ?? '');
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(toDateInputValue(new Date()));

  const selectedWorkbook = workbooks.find((workbook) => workbook.id === selectedWorkbookId) ?? null;

  const selectedWorkbookAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.workbookId === selectedWorkbookId)
        .sort((first, second) => new Date(second.assignedAt).getTime() - new Date(first.assignedAt).getTime()),
    [assignments, selectedWorkbookId],
  );

  const activeAssignedCohortIds = useMemo(
    () =>
      new Set(
        selectedWorkbookAssignments
          .filter((assignment) => assignment.status === 'active')
          .map((assignment) => assignment.cohortId),
      ),
    [selectedWorkbookAssignments],
  );

  const assignmentByCohort = useMemo(() => {
    const result = new Map<string, WorkbookAssignmentRow>();

    selectedWorkbookAssignments.forEach((assignment) => {
      const previous = result.get(assignment.cohortId);
      if (!previous || new Date(assignment.assignedAt) > new Date(previous.assignedAt)) {
        result.set(assignment.cohortId, assignment);
      }
    });

    return result;
  }, [selectedWorkbookAssignments]);

  const assignmentTableRows = useMemo<WorkbookAssignmentTableRow[]>(
    () =>
      assignments
        .map((assignment) => {
          const workbook = workbooks.find((item) => item.id === assignment.workbookId);
          const cohort = cohorts.find((item) => item.id === assignment.cohortId);

          return {
            id: assignment.id,
            workbookTitle: workbook?.title ?? '-',
            cohortName: cohort?.name ?? '-',
            cohortCode: cohort?.code ?? '-',
            assignedAt: assignment.assignedAt,
            dueDate: assignment.dueDate,
            status: assignment.status,
          };
        })
        .sort((first, second) => new Date(second.assignedAt).getTime() - new Date(first.assignedAt).getTime()),
    [assignments],
  );

  const toggleCohort = (cohortId: string) => {
    if (activeAssignedCohortIds.has(cohortId)) return;

    setSelectedCohortIds((current) =>
      current.includes(cohortId) ? current.filter((id) => id !== cohortId) : [...current, cohortId],
    );
  };

  const distributeWorkbook = () => {
    if (!selectedWorkbookId || selectedCohortIds.length === 0) return;

    const now = new Date().toISOString();
    const nextDueDate = toDueDate(dueDate);

    setAssignments((current) => {
      const nextAssignments = [...current];

      selectedCohortIds.forEach((cohortId, index) => {
        const activeAssignment = nextAssignments.find(
          (assignment) =>
            assignment.workbookId === selectedWorkbookId &&
            assignment.cohortId === cohortId &&
            assignment.status === 'active',
        );

        if (activeAssignment) return;

        nextAssignments.push({
          id: `assignment-${selectedWorkbookId}-${cohortId}-${Date.now()}-${index + 1}`,
          workbookId: selectedWorkbookId,
          cohortId,
          assignedBy: 'user-teacher-1',
          assignedAt: now,
          dueDate: nextDueDate,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      });

      return nextAssignments;
    });
    setSelectedCohortIds([]);
  };

  const cancelAssignment = (assignmentId: string) => {
    const now = new Date().toISOString();

    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              status: 'closed',
              updatedAt: now,
            }
          : assignment,
      ),
    );
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
          disabled={!selectedWorkbookId || selectedCohortIds.length === 0}
          type="button"
          onClick={distributeWorkbook}
        >
          {selectedCohortIds.length.toLocaleString('ko-KR')}개 기수에 배포
        </button>
      </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>배포 설정</h2>
            <p>문제집과 배포 대상 기수를 선택하고 마감일을 지정합니다.</p>
          </div>
          {selectedWorkbook ? (
            <div className="workbook-summary">
              <strong>{selectedWorkbook.questionCount ?? 0}문항</strong>
              <span>{selectedWorkbook.totalPoints ?? 0}점</span>
              <span className={`status-pill status-${selectedWorkbook.status}`}>
                {workbookStatusLabels[selectedWorkbook.status]}
              </span>
            </div>
          ) : null}
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span>문제집</span>
            <select
              value={selectedWorkbookId}
              onChange={(event) => {
                setSelectedWorkbookId(event.target.value);
                setSelectedCohortIds([]);
              }}
            >
              {workbooks.map((workbook) => (
                <option key={workbook.id} value={workbook.id}>
                  {workbook.title}
                </option>
              ))}
            </select>
          </label>

          <label className="search-field">
            <span>배포 마감일</span>
            <input value={dueDate} type="date" onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>

        {selectedWorkbook ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>선택</th>
                  <th>기수</th>
                  <th>학생수</th>
                  <th>기수 상태</th>
                  <th>배포 상태</th>
                  <th>마감일</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort) => {
                  const assignment = assignmentByCohort.get(cohort.id);
                  const isActiveAssigned = assignment?.status === 'active';
                  const isSelected = selectedCohortIds.includes(cohort.id);

                  return (
                    <tr key={cohort.id}>
                      <td>
                        <input
                          checked={isSelected || isActiveAssigned}
                          disabled={isActiveAssigned}
                          type="checkbox"
                          onChange={() => toggleCohort(cohort.id)}
                        />
                      </td>
                      <td>
                        <div className="table-title">{cohort.name}</div>
                        <span className="table-subtitle">
                          {cohort.code} · {cohort.description ?? '설명 없음'}
                        </span>
                      </td>
                      <td>{cohort.studentCount.toLocaleString('ko-KR')}명</td>
                      <td>
                        <span className={`status-pill status-${cohort.status}`}>
                          {cohortStatusLabels[cohort.status]}
                        </span>
                      </td>
                      <td>
                        {assignment ? (
                          <span className={`status-pill status-${assignment.status}`}>
                            {assignmentStatusLabels[assignment.status]}
                          </span>
                        ) : (
                          <span className="table-subtitle">미배포</span>
                        )}
                      </td>
                      <td>{formatDate(assignment?.dueDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-drop">
            <strong>배포할 문제집이 없습니다.</strong>
            <p>문제집 관리에서 문제집을 먼저 생성하세요.</p>
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>배포 이력</h2>
            <p>활성 배포는 취소할 수 있으며, 취소된 배포는 종료 상태로 남습니다.</p>
          </div>
        </div>
        <WorkbookAssignmentTable assignments={assignmentTableRows} onCancel={cancelAssignment} />
      </section>
    </div>
  );
}
