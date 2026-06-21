export type LoginRole = 'teacher' | 'student';

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
  role: LoginRole;
  profileId: string;
};
