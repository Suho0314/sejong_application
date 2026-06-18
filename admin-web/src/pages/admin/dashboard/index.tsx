import cohorts from '../../../mock/cohorts.json';
import scores from '../../../mock/scores.json';
import students from '../../../mock/students.json';
import workbooks from '../../../mock/workbooks.json';

type Assignment = {
  id: string;
  workbookId: string;
  cohortId: string;
  status: string;
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  submissionCount: number;
};

type Submission = {
  id: string;
  workbookAssignmentId: string;
  studentId: string;
  attemptNo: number;
  status: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  submittedAt: string | null;
};

type DashboardAssignment = Assignment & {
  workbookTitle: string;
  questionCount: number;
  totalPoints: number;
  cohortName: string;
};

type DashboardSubmission = Submission & {
  workbookTitle: string;
  cohortName: string;
  studentName: string;
};

const formatDateTime = (value: string | null) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: '진행중',
    scheduled: '예정',
    closed: '종료',
    cancelled: '취소',
    graded: '채점완료',
    submitted: '제출됨',
    in_progress: '풀이중',
  };

  return labels[status] ?? status;
};

export function DashboardPage() {
  const assignments = workbooks
    .flatMap((workbook) =>
      workbook.assignments.map((assignment) => ({
        ...assignment,
        workbookTitle: workbook.title,
        questionCount: workbook.questionCount,
        totalPoints: workbook.totalPoints,
        cohortName: cohorts.find((cohort) => cohort.id === assignment.cohortId)?.name ?? '-',
      })),
    )
    .sort((a, b) => {
      const aTime = new Date(a.opensAt ?? a.createdAt).getTime();
      const bTime = new Date(b.opensAt ?? b.createdAt).getTime();
      return bTime - aTime;
    }) as DashboardAssignment[];

  const submissions = (scores.submissions as Submission[])
    .map((submission) => {
      const assignment = assignments.find((item) => item.id === submission.workbookAssignmentId);
      const student = students.find((item) => item.id === submission.studentId);

      return {
        ...submission,
        workbookTitle: assignment?.workbookTitle ?? '-',
        cohortName: assignment?.cohortName ?? '-',
        studentName: student?.name ?? '-',
      };
    })
    .sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    }) as DashboardSubmission[];

  const gradedSubmissions = submissions.filter((submission) => submission.status === 'graded');

  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round((gradedSubmissions.reduce((sum, item) => sum + item.score, 0) / gradedSubmissions.length) * 10) /
        10
      : 0;

  const recentAssignments = assignments.slice(0, 5);
  const recentSubmissions = submissions.slice(0, 6);

  const stats = [
    { label: '학생수', value: students.length.toLocaleString('ko-KR'), note: '전체 등록 학생' },
    { label: '기수수', value: cohorts.length.toLocaleString('ko-KR'), note: '전체 기수' },
    { label: '문제집수', value: workbooks.length.toLocaleString('ko-KR'), note: '생성된 문제집' },
    { label: '평균점수', value: `${averageScore}점`, note: '채점 완료 기준 평균' },
  ];

  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Instructor Workspace</p>
          <h1>Dashboard</h1>
        </div>
        <span className="today-label">Mock Data</span>
      </section>

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
                {recentAssignments.map((assignment) => (
                  <tr key={assignment.id}>
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
                ))}
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
            {recentSubmissions.map((submission) => (
              <div className="exam-item" key={submission.id}>
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
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
