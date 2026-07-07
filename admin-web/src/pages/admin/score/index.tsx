import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { cohortApi, CohortApiItem } from '../../../api/cohorts';
import { scoreApi, ScoreApiItem, WorkbookQuestionStatsApiItem } from '../../../api/scores';
import { studentApi, StudentApiItem } from '../../../api/students';
import { submissionApi, SubmissionDetailApiItem } from '../../../api/submissions';
import { workbookAssignmentApi, WorkbookAssignmentApiItem } from '../../../api/workbookAssignments';
import { workbookApi, WorkbookApiItem } from '../../../api/workbooks';
import { Pagination } from '../../../components/admin/Pagination';
import { ScoreSubmissionRow, ScoreSubmissionTable } from '../../../components/admin/ScoreSubmissionTable';

const PAGE_SIZE = 10;
const OPTION_LIMIT = 100;

const modalBackdropStyle: CSSProperties = {
  alignItems: 'center',
  background: 'rgba(15, 23, 42, 0.36)',
  display: 'flex',
  inset: 0,
  justifyContent: 'center',
  padding: 24,
  position: 'fixed',
  zIndex: 20,
};

const modalPanelStyle: CSSProperties = {
  maxHeight: 'calc(100vh - 48px)',
  maxWidth: 920,
  overflowY: 'auto',
  width: 'min(920px, 100%)',
};

const questionTextPreviewStyle: CSSProperties = {
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  whiteSpace: 'normal',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const toRow = (score: ScoreApiItem): ScoreSubmissionRow => ({
  id: score.submissionId,
  studentName: score.student.name,
  studentNo: score.student.studentNo ?? undefined,
  cohortName: score.cohort.name,
  workbookTitle: score.workbook.title,
  score: score.earnedPoints,
  totalScore: score.totalPoints,
  correctCount: score.correctCount,
  wrongCount: score.wrongCount,
  status: score.status,
  submittedAt: score.submittedAt,
});

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const formatWrongRate = (wrongRate: number) =>
  new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(wrongRate);

const formatWrongRateSummary = (stat: WorkbookQuestionStatsApiItem) => {
  if (stat.answerCount === 0) {
    return '- / 0건';
  }

  return `${formatWrongRate(stat.wrongRate)}% / ${stat.answerCount}건`;
};

export function ScorePage() {
  const [scores, setScores] = useState<ScoreApiItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortApiItem[]>([]);
  const [students, setStudents] = useState<StudentApiItem[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookApiItem[]>([]);
  const [assignments, setAssignments] = useState<WorkbookAssignmentApiItem[]>([]);
  const [cohortId, setCohortId] = useState('all');
  const [studentId, setStudentId] = useState('all');
  const [workbookId, setWorkbookId] = useState('all');
  const [assignmentId, setAssignmentId] = useState('all');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetailApiItem | null>(null);
  const [questionStats, setQuestionStats] = useState<WorkbookQuestionStatsApiItem[]>([]);
  const [isQuestionStatsOpen, setIsQuestionStatsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionLoading, setIsOptionLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isQuestionStatsLoading, setIsQuestionStatsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = useMemo(() => scores.map(toRow), [scores]);
  const submittedScores = scores.filter((score) => score.submittedAt);
  const averageScore = average(submittedScores.map((score) => score.score));
  const averageCorrectRate = average(submittedScores.map((score) => score.correctRate));
  const selectedWorkbook = workbooks.find((workbook) => workbook.id === workbookId);
  const hasSelectedWorkbook = workbookId !== 'all';

  const statCards = [
    {
      label: '성적 건수',
      value: `${totalItems.toLocaleString('ko-KR')}건`,
      note: '현재 필터 기준',
    },
    {
      label: '평균 점수',
      value: `${averageScore}점`,
      note: '현재 페이지 기준',
    },
    {
      label: '평균 정답률',
      value: `${averageCorrectRate}%`,
      note: '현재 페이지 기준',
    },
    {
      label: '상세 조회',
      value: selectedSubmission ? '열림' : '대기',
      note: '제출 답안 확인',
    },
  ];

  const loadScores = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await scoreApi.list({
        page: nextPage,
        limit: PAGE_SIZE,
        cohortId: cohortId === 'all' ? undefined : cohortId,
        studentId: studentId === 'all' ? undefined : studentId,
        workbookId: workbookId === 'all' ? undefined : workbookId,
        assignmentId: assignmentId === 'all' ? undefined : assignmentId,
      });

      setScores(response.data);
      setTotalItems(response.meta.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '성적 목록을 불러오지 못했습니다.');
      setScores([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, cohortId, page, studentId, workbookId]);

  const loadOptions = useCallback(async () => {
    setIsOptionLoading(true);
    setErrorMessage('');

    try {
      const [cohortResponse, studentResponse, workbookResponse, assignmentResponse] = await Promise.all([
        cohortApi.list({ page: 1, limit: OPTION_LIMIT }),
        studentApi.list({ page: 1, limit: OPTION_LIMIT }),
        workbookApi.list({ page: 1, limit: OPTION_LIMIT }),
        workbookAssignmentApi.list({ page: 1, limit: OPTION_LIMIT }),
      ]);

      setCohorts(cohortResponse.data);
      setStudents(studentResponse.data);
      setWorkbooks(workbookResponse.data);
      setAssignments(assignmentResponse.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '필터 옵션을 불러오지 못했습니다.');
    } finally {
      setIsOptionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const resetPage = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const viewSubmissionDetail = async (submissionId: string) => {
    setIsDetailLoading(true);
    setErrorMessage('');

    try {
      const response = await submissionApi.get(submissionId);
      setSelectedSubmission(response.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '제출 상세를 불러오지 못했습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openQuestionStats = async () => {
    if (!hasSelectedWorkbook) return;

    setIsQuestionStatsLoading(true);
    setErrorMessage('');

    try {
      const response = await scoreApi.getWorkbookQuestionStats(workbookId);
      setQuestionStats(response.data);
      setIsQuestionStatsOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '문항별 오답률을 불러오지 못했습니다.');
      setQuestionStats([]);
    } finally {
      setIsQuestionStatsLoading(false);
    }
  };

  const closeQuestionStats = () => {
    setIsQuestionStatsOpen(false);
    setQuestionStats([]);
  };

  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Score Management</p>
          <h1>성적관리 / 제출조회</h1>
        </div>
        <span className="today-label">Backend API</span>
      </section>

      {errorMessage ? <p className="table-subtitle">{errorMessage}</p> : null}

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>조회 필터</h2>
            <p>기수, 학생, 문제집, 배포 기준으로 제출 성적을 조회합니다.</p>
          </div>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span>기수</span>
            <select value={cohortId} onChange={(event) => resetPage(() => setCohortId(event.target.value))}>
              <option value="all">전체 기수</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>학생</span>
            <select value={studentId} onChange={(event) => resetPage(() => setStudentId(event.target.value))}>
              <option value="all">전체 학생</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.studentNo ? `(${student.studentNo})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>문제집</span>
            <select value={workbookId} onChange={(event) => resetPage(() => setWorkbookId(event.target.value))}>
              <option value="all">전체 문제집</option>
              {workbooks.map((workbook) => (
                <option key={workbook.id} value={workbook.id}>
                  {workbook.title}
                </option>
              ))}
            </select>
          </label>
          <label className="search-field">
            <span>배포</span>
            <select value={assignmentId} onChange={(event) => resetPage(() => setAssignmentId(event.target.value))}>
              <option value="all">전체 배포</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.workbook.title} / {assignment.cohort.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isOptionLoading ? <p className="table-subtitle">필터 옵션을 불러오는 중입니다.</p> : null}
      </section>

      <section className="stat-grid">
        {statCards.map((card) => (
          <article className="stat-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h2>성적 목록</h2>
            <p>학생명, 기수명, 문제집명, 점수, 제출일을 확인합니다.</p>
          </div>
          <button
            className="secondary-button"
            disabled={!hasSelectedWorkbook || isQuestionStatsLoading}
            type="button"
            onClick={openQuestionStats}
          >
            {isQuestionStatsLoading ? '불러오는 중...' : '문항별 오답률 보기'}
          </button>
        </div>
        {!hasSelectedWorkbook ? (
          <p className="table-subtitle">문항별 오답률을 보려면 문제집을 먼저 선택해주세요.</p>
        ) : null}
        {isLoading ? <p className="table-subtitle">성적 목록을 불러오는 중입니다.</p> : null}
        <ScoreSubmissionTable submissions={rows} onViewDetail={viewSubmissionDetail} />
        <Pagination currentPage={currentPage} totalItems={totalItems} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {isDetailLoading ? <p className="table-subtitle">제출 상세를 불러오는 중입니다.</p> : null}

      {isQuestionStatsOpen ? (
        <div aria-modal="true" role="dialog" style={modalBackdropStyle}>
          <section className="dashboard-panel" style={modalPanelStyle}>
            <div className="panel-header">
              <div>
                <h2>문항별 오답률</h2>
                <p>{selectedWorkbook?.title ?? '선택한 문제집'} 기준 문항별 제출 통계입니다.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeQuestionStats}>
                닫기
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>문제 내용</th>
                    <th>응답수</th>
                    <th>정답수</th>
                    <th>오답수</th>
                    <th>오답률</th>
                  </tr>
                </thead>
                <tbody>
                  {questionStats.map((stat) => (
                    <tr key={stat.questionId}>
                      <td>{stat.questionNumber}번</td>
                      <td>
                        <div className="table-title" style={questionTextPreviewStyle}>
                          {stat.questionText}
                        </div>
                      </td>
                      <td>{stat.answerCount.toLocaleString('ko-KR')}건</td>
                      <td>{stat.correctCount.toLocaleString('ko-KR')}건</td>
                      <td>{stat.wrongCount.toLocaleString('ko-KR')}건</td>
                      <td>{formatWrongRateSummary(stat)}</td>
                    </tr>
                  ))}
                  {questionStats.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={6}>
                        문항 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {selectedSubmission ? (
        <div aria-modal="true" role="dialog" style={modalBackdropStyle}>
          <section className="dashboard-panel" style={modalPanelStyle}>
            <div className="panel-header">
              <div>
                <h2>제출 상세</h2>
                <p>
                  {selectedSubmission.studentName} · {selectedSubmission.cohortName} ·{' '}
                  {selectedSubmission.workbookTitle}
                </p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setSelectedSubmission(null)}>
                닫기
              </button>
            </div>

            <div className="stat-grid">
              <article className="stat-card">
                <span>점수</span>
                <strong>
                  {selectedSubmission.earnedPoints}/{selectedSubmission.totalPoints}
                </strong>
                <p>{selectedSubmission.score}점</p>
              </article>
              <article className="stat-card">
                <span>정답</span>
                <strong>{selectedSubmission.correctCount}개</strong>
                <p>오답 {selectedSubmission.wrongCount}개</p>
              </article>
              <article className="stat-card">
                <span>제출일</span>
                <strong>{formatDate(selectedSubmission.submittedAt)}</strong>
                <p>응시 {selectedSubmission.attemptNo}회차</p>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>문제</th>
                    <th>선택 답안</th>
                    <th>정답</th>
                    <th>결과</th>
                    <th>획득점수</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmission.answers.map((answer) => (
                    <tr key={answer.id}>
                      <td>
                        <div className="table-title">{answer.questionContent}</div>
                        <span className="table-subtitle">
                          {answer.sequence}번 · {answer.subject} · {answer.category ?? '미분류'}
                        </span>
                      </td>
                      <td>{answer.selectedChoiceText ?? '미선택'}</td>
                      <td>{answer.correctChoiceText ?? '-'}</td>
                      <td>
                        <span className={`status-pill ${answer.isCorrect ? 'status-open' : 'status-cancelled'}`}>
                          {answer.isCorrect ? '정답' : '오답'}
                        </span>
                      </td>
                      <td>{answer.earnedPoints.toLocaleString('ko-KR')}점</td>
                    </tr>
                  ))}
                  {selectedSubmission.answers.length === 0 ? (
                    <tr>
                      <td className="empty-cell" colSpan={5}>
                        답안 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
