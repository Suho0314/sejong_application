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
