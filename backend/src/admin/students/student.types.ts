export type StudentStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type StudentRow = {
  id: string;
  user_id: string;
  name: string;
  login_id: string;
  email: string | null;
  phone: string | null;
  birth_date: string | Date | null;
  cohort_id: string | null;
  cohort_name: string | null;
  auth_provider: string;
  provider_user_id: string | null;
  student_no: string | null;
  status: StudentStatus;
  enrolled_on: string | Date | null;
  completed_on: string | Date | null;
  approved_at: Date | null;
  approved_by_teacher_id: string | null;
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
  birthDate: string | null;
  cohort: {
    id: string | null;
    name: string | null;
  };
  cohortId: string | null;
  authProvider: string;
  providerUserId: string | null;
  studentNo: string | null;
  status: StudentStatus;
  enrolledOn: string | null;
  completedOn: string | null;
  approvedAt: string | null;
  approvedByTeacherId: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
};
