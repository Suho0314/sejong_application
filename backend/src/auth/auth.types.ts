export type UserRole = 'admin' | 'teacher' | 'student';
export type LoginRole = Extract<UserRole, 'teacher' | 'student'>;

export type LoginUserRow = {
  id: string;
  login_id: string;
  name: string;
  email: string | null;
  password_hash: string;
  role: LoginRole;
  profile_id: string;
  cohort_id: string | null;
};

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  profileId?: string;
};

export type StudentApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type KakaoUserInfo = {
  providerUserId: string;
  nickname: string | null;
  email: string | null;
};

export type KakaoStudentRow = {
  user_id: string;
  login_id: string;
  name: string;
  email: string | null;
  user_status: 'active' | 'inactive';
  student_id: string;
  cohort_id: string | null;
  student_status: StudentApprovalStatus;
};


export type TeacherAccountRow = {
  id: string;
  login_id: string;
  name: string;
  email: string | null;
  role: 'teacher';
  status: 'active' | 'inactive';
  teacher_id: string;
  phone: string | null;
  department: string | null;
  created_at: Date;
  updated_at: Date;
};
