export type WorkbookAssignmentStatus = 'scheduled' | 'open' | 'closed';

export type WorkbookAssignmentRow = {
  id: string;
  workbook_id: string;
  workbook_title: string;
  cohort_id: string;
  cohort_name: string;
  assigned_by_teacher_id: string;
  status: WorkbookAssignmentStatus;
  opens_at: Date;
  closes_at: Date | null;
  max_attempts: number;
  submission_count: string;
  created_at: Date;
  updated_at: Date;
};

export type WorkbookAssignmentResponse = {
  id: string;
  workbook: {
    id: string;
    title: string;
  };
  cohort: {
    id: string;
    name: string;
  };
  assignedByTeacherId: string;
  status: WorkbookAssignmentStatus;
  opensAt: string;
  closesAt: string | null;
  maxAttempts: number;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
};
