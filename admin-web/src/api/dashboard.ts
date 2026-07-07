import { apiRequest } from '.';

export type DashboardAssignment = {
  assignmentId: string;
  workbookId: string;
  workbookTitle: string;
  cohortId: string;
  cohortName: string;
  status: 'scheduled' | 'open' | 'closed';
  questionCount: number;
  submissionCount: number;
  closesAt: string | null;
  assignedAt: string;
};

export type DashboardSubmission = {
  submissionId: string;
  assignmentId: string;
  workbookId: string;
  workbookTitle: string;
  studentId: string;
  studentName: string;
  cohortId: string;
  cohortName: string;
  attemptNo: number;
  status: 'submitted' | 'graded';
  score: number;
  submittedAt: string;
};

export type DashboardData = {
  summary: {
    totalStudents: number;
    totalCohorts: number;
    totalWorkbooks: number;
    averageScore: number;
  };
  recentAssignments: DashboardAssignment[];
  recentSubmissions: DashboardSubmission[];
};

type DashboardResponse = {
  data: DashboardData;
};

export const dashboardApi = {
  get() {
    return apiRequest<DashboardResponse>('/admin/dashboard');
  },
};
