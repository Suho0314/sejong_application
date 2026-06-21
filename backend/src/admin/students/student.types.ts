export type StudentStatus = 'active' | 'inactive' | 'paused' | 'graduated';

export type StudentRow = {
  id: string;
  user_id: string;
  name: string;
  login_id: string;
  email: string | null;
  phone: string | null;
  cohort_id: string;
  cohort_name: string;
  student_no: string | null;
  status: StudentStatus;
  enrolled_on: string | Date;
  completed_on: string | Date | null;
  memo: string | null;
  created_at: Date;
  updated_at: Date;
};

export type StudentResponse = {
  id: string;
  userId: string;
  name: string;
  loginId: string;
  email: string | null;
  phone: string | null;
  cohort: {
    id: string;
    name: string;
  };
  cohortId: string;
  studentNo: string | null;
  status: StudentStatus;
  enrolledOn: string;
  completedOn: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
};
