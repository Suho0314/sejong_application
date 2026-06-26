import { useCallback, useEffect, useState } from 'react';
import { dashboardApi, type DashboardData } from '../../../api/dashboard';

const formatDateTime = (value: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: '진행중',
    scheduled: '예정',
    closed: '종료',
    graded: '채점완료',
    submitted: '제출됨',
  };

  return labels[status] ?? status;
};

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await dashboardApi.get();
      setDashboard(response.data);
    } catch {
      setDashboard(null);
      setErrorMessage('대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summary = dashboard?.summary ?? {
    totalStudents: 0,
    totalCohorts: 0,
    totalWorkbooks: 0,
    averageScore: 0,
  };
  const recentAssignments = dashboard?.recentAssignments ?? [];
  const recentSubmissions = dashboard?.recentSubmissions ?? [];
  const stats = [
    { label: '전체 학생수', value: summary.totalStudents.toLocaleString('ko-KR'), note: 'students 전체' },
    { label: '기수수', value: summary.totalCohorts.toLocaleString('ko-KR'), note: '전체 기수' },
    { label: '문제집수', value: summary.totalWorkbooks.toLocaleString('ko-KR'), note: '생성된 문제집' },
    {
      label: '평균점수',
      value: `${summary.averageScore.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}점`,
      note: '채점 완료 기준 평균',
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Instructor Workspace</p>
          <h1>Dashboard</h1>
        </div>
        <span className="today-label">Backend API</span>
      </section>

      {isLoading ? (
        <section className="dashboard-panel dashboard-state-panel" aria-live="polite">
          <strong>최신 대시보드 데이터를 불러오는 중입니다.</strong>
          <p>학생, 기수, 문제집과 제출 현황을 조회하고 있습니다.</p>
        </section>
      ) : null}

      {!isLoading && errorMessage ? (
        <section className="dashboard-panel dashboard-state-panel" role="alert">
          <strong>{errorMessage}</strong>
          <p>잠시 후 다시 시도해주세요.</p>
          <button className="primary-button" type="button" onClick={() => void loadDashboard()}>
            다시 조회
          </button>
        </section>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <section className="stat-grid" aria-label="주요 지표">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.note}</p>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>최근 배포된 문제집</h2>
                  <p>기수별 배포 상태와 제출 현황</p>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>문제집</th>
                      <th>기수</th>
                      <th>상태</th>
                      <th>문항</th>
                      <th>제출</th>
                      <th>마감</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignments.length === 0 ? (
                      <tr>
                        <td className="empty-cell" colSpan={6}>최근 배포된 문제집이 없습니다.</td>
                      </tr>
                    ) : (
                      recentAssignments.map((assignment) => (
                        <tr key={assignment.assignmentId}>
                          <td>{assignment.workbookTitle}</td>
                          <td>{assignment.cohortName}</td>
                          <td>
                            <span className={`status-pill status-${assignment.status}`}>
                              {getStatusLabel(assignment.status)}
                            </span>
                          </td>
                          <td>{assignment.questionCount}문항</td>
                          <td>{assignment.submissionCount}건</td>
                          <td>{formatDateTime(assignment.closesAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>최근 성적</h2>
                  <p>최근 제출/시험 결과</p>
                </div>
              </div>

              <div className="exam-list">
                {recentSubmissions.length === 0 ? (
                  <p className="empty-cell">최근 제출 내역이 없습니다.</p>
                ) : (
                  recentSubmissions.map((submission) => (
                    <div className="exam-item" key={submission.submissionId}>
                      <div>
                        <strong>{submission.workbookTitle}</strong>
                        <p>
                          {submission.studentName} · {submission.cohortName} · {submission.attemptNo}회차 ·{' '}
                          {getStatusLabel(submission.status)}
                        </p>
                      </div>
                      <div className="exam-score">
                        <strong>{submission.status === 'graded' ? `${submission.score}점` : '채점대기'}</strong>
                        <span>{formatDateTime(submission.submittedAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
