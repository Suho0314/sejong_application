import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { ChangeTeacherPasswordDto, UpdateTeacherAccountDto } from './dto/account-settings.dto';
import {
  AccessTokenPayload,
  KakaoStudentRow,
  KakaoUserInfo,
  LoginRole,
  LoginUserRow,
  StudentApprovalStatus,
  TeacherAccountRow,
} from './auth.types';

const INVALID_CREDENTIALS_RESPONSE = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: '로그인 정보가 올바르지 않습니다.',
    details: [],
  },
};

const INVALID_KAKAO_REDIRECT_URI_RESPONSE = {
  error: {
    code: 'KAKAO_REDIRECT_URI_NOT_ALLOWED',
    message: '허용되지 않은 카카오 Redirect URI입니다.',
    details: [],
  },
};

const KAKAO_STUDENT_FALLBACK_NAME = '카카오 학생';
const KAKAO_STUDENT_PROFILE_SCOPES = ['profile_nickname', 'account_email'];

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  loginTeacher(credentials: LoginDto) {
    return this.login(credentials, 'teacher');
  }

  private async login(credentials: LoginDto, role: LoginRole) {
    const identifier = credentials.loginId?.trim() || credentials.email?.trim();

    if (!identifier) {
      this.throwInvalidCredentials();
    }

    const user = await this.findUser(identifier, role);
    const passwordMatches = user
      ? await bcrypt.compare(credentials.password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      this.throwInvalidCredentials();
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      profileId: user.profile_id,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      data: {
        accessToken,
        user:
          role === 'teacher'
            ? {
                id: user.id,
                role: user.role,
                name: user.name,
                loginId: user.login_id,
                email: user.email,
                teacherId: user.profile_id,
              }
            : {
                id: user.id,
                role: user.role,
                name: user.name,
                loginId: user.login_id,
                email: user.email,
                studentId: user.profile_id,
                cohortId: user.cohort_id,
              },
      },
    };
  }



  async getTeacherAccount(userId?: string) {
    const account = await this.findActiveTeacherAccount(userId);

    return {
      data: this.toTeacherAccountResponse(account),
    };
  }

  async updateTeacherAccount(userId: string | undefined, body: UpdateTeacherAccountDto) {
    const current = await this.findActiveTeacherAccount(userId);
    const pool = this.databaseService.getPool();
    const client = await pool.connect();
    const email = normalizeOptionalString(body.email);
    const phone = normalizeOptionalString(body.phone);

    try {
      await client.query('BEGIN');

      const duplicateLoginId = await client.query<{ id: string }>(
        `SELECT id
         FROM users
         WHERE login_id = $1
           AND id <> $2
           AND deleted_at IS NULL
         LIMIT 1`,
        [body.loginId, current.id],
      );

      if (duplicateLoginId.rows.length > 0) {
        throw new ConflictException({
          error: {
            code: 'LOGIN_ID_ALREADY_EXISTS',
            message: '이미 사용 중인 ID입니다.',
            details: [],
          },
        });
      }

      if (email) {
        const duplicateEmail = await client.query<{ id: string }>(
          `SELECT id
           FROM users
           WHERE LOWER(email) = LOWER($1)
             AND id <> $2
             AND deleted_at IS NULL
           LIMIT 1`,
          [email, current.id],
        );

        if (duplicateEmail.rows.length > 0) {
          throw new ConflictException({
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: '이미 사용 중인 이메일입니다.',
              details: [],
            },
          });
        }
      }

      await client.query(
        `UPDATE users
         SET login_id = $2,
             name = $3,
             email = $4,
             updated_at = now()
         WHERE id = $1
           AND role = 'teacher'
           AND status = 'active'
           AND deleted_at IS NULL`,
        [current.id, body.loginId, body.name, email],
      );
      await client.query(
        `UPDATE teachers
         SET phone = $2,
             updated_at = now()
         WHERE id = $1
           AND deleted_at IS NULL`,
        [current.teacher_id, phone],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const updated = await this.findActiveTeacherAccount(userId);

    return {
      data: this.toTeacherAccountResponse(updated),
    };
  }

  async changeTeacherPassword(userId: string | undefined, body: ChangeTeacherPasswordDto) {
    const account = await this.findActiveTeacherAccountWithPassword(userId);
    const passwordMatches = await bcrypt.compare(body.currentPassword, account.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException({
        error: {
          code: 'CURRENT_PASSWORD_MISMATCH',
          message: '현재 비밀번호가 일치하지 않습니다.',
          details: [],
        },
      });
    }

    if (body.nextPassword !== body.confirmPassword) {
      throw new BadRequestException({
        error: {
          code: 'PASSWORD_CONFIRM_MISMATCH',
          message: '새 비밀번호 확인이 일치하지 않습니다.',
          details: [],
        },
      });
    }

    if (body.currentPassword === body.nextPassword) {
      throw new BadRequestException({
        error: {
          code: 'PASSWORD_NOT_CHANGED',
          message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
          details: [],
        },
      });
    }

    const passwordHash = await bcrypt.hash(body.nextPassword, 10);

    await this.databaseService.getPool().query(
      `UPDATE users
       SET password_hash = $2,
           updated_at = now()
       WHERE id = $1
         AND role = 'teacher'
         AND status = 'active'
         AND deleted_at IS NULL`,
      [account.id, passwordHash],
    );

    return {
      data: {
        changed: true,
      },
    };
  }

  getKakaoAuthorizeUrl(redirectUri: string, state: string) {
    this.assertAllowedKakaoRedirectUri(redirectUri);
    this.assertValidOAuthState(state);

    const clientId = this.getKakaoClientId();
    const authorizationUrl = new URL('https://kauth.kakao.com/oauth/authorize');

    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('scope', KAKAO_STUDENT_PROFILE_SCOPES.join(','));

    return {
      data: {
        authorizationUrl: authorizationUrl.toString(),
      },
    };
  }

  async loginStudentWithKakao(code: string, redirectUri: string, state: string) {
    this.assertAllowedKakaoRedirectUri(redirectUri);
    this.assertValidOAuthState(state);

    const kakaoAccessToken = await this.exchangeKakaoCode(code, redirectUri);
    const kakaoUser = await this.getKakaoUserInfo(kakaoAccessToken);
    const student = await this.findOrCreateKakaoStudent(kakaoUser);

    if (student.user_status !== 'active') {
      return this.toStudentStatusResponse('suspended', student);
    }

    if (student.student_status !== 'approved') {
      return this.toStudentStatusResponse(student.student_status, student);
    }

    if (!student.cohort_id) {
      return this.toStudentStatusResponse('pending', student);
    }

    const payload: AccessTokenPayload = {
      sub: student.user_id,
      role: 'student',
      profileId: student.student_id,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      data: {
        status: 'approved' as const,
        accessToken,
        user: {
          id: student.user_id,
          role: 'student' as const,
          name: student.name,
          loginId: student.login_id,
          email: student.email,
          studentId: student.student_id,
          cohortId: student.cohort_id,
        },
      },
    };
  }



  private async findActiveTeacherAccount(userId?: string): Promise<TeacherAccountRow> {
    const account = await this.findActiveTeacherAccountRow(userId, false);
    return account as TeacherAccountRow;
  }

  private async findActiveTeacherAccountWithPassword(userId?: string): Promise<TeacherAccountRow & { password_hash: string }> {
    const account = await this.findActiveTeacherAccountRow(userId, true);
    return account as TeacherAccountRow & { password_hash: string };
  }

  private async findActiveTeacherAccountRow(
    userId: string | undefined,
    includePasswordHash: boolean,
  ): Promise<TeacherAccountRow | (TeacherAccountRow & { password_hash: string })> {
    if (!userId) {
      this.throwInvalidCredentials();
    }

    const passwordColumn = includePasswordHash ? ', users.password_hash' : '';
    const result = await this.databaseService.getPool().query<TeacherAccountRow & { password_hash?: string }>(
      `SELECT
         users.id,
         users.login_id,
         users.name,
         users.email,
         users.role,
         users.status,
         teachers.id AS teacher_id,
         teachers.phone,
         teachers.department,
         users.created_at,
         users.updated_at
         ${passwordColumn}
       FROM users
       JOIN teachers
         ON teachers.user_id = users.id
        AND teachers.deleted_at IS NULL
       WHERE users.id = $1
         AND users.role = 'teacher'
         AND users.status = 'active'
         AND users.deleted_at IS NULL
       LIMIT 1`,
      [userId],
    );
    const account = result.rows[0];

    if (!account) {
      this.throwInvalidCredentials();
    }

    return account;
  }

  private toTeacherAccountResponse(account: TeacherAccountRow) {
    return {
      id: account.id,
      role: account.role,
      name: account.name,
      loginId: account.login_id,
      email: account.email,
      teacherId: account.teacher_id,
      phone: account.phone,
      department: account.department,
      status: account.status,
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  private async exchangeKakaoCode(code: string, redirectUri: string): Promise<string> {
    const clientId = this.getKakaoClientId();
    const clientSecret = this.configService.get<string>('KAKAO_CLIENT_SECRET');
    const form = new URLSearchParams();

    form.set('grant_type', 'authorization_code');
    form.set('client_id', clientId);
    form.set('redirect_uri', redirectUri);
    form.set('code', code);

    if (clientSecret) {
      form.set('client_secret', clientSecret);
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: form,
    });
    const body = await response.json().catch(() => null) as { access_token?: string } | null;

    if (!response.ok || !body?.access_token) {
      throw new UnauthorizedException({
        error: {
          code: 'KAKAO_TOKEN_EXCHANGE_FAILED',
          message: '카카오 인증에 실패했습니다. 다시 로그인해주세요.',
          details: [],
        },
      });
    }

    return body.access_token;
  }

  private async getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = await response.json().catch(() => null) as {
      id?: number | string;
      properties?: { nickname?: string };
      kakao_account?: {
        email?: string;
        name?: string;
        profile?: { nickname?: string };
      };
    } | null;

    if (!response.ok || body?.id === undefined || body.id === null) {
      throw new UnauthorizedException({
        error: {
          code: 'KAKAO_USER_INFO_FAILED',
          message: '카카오 사용자 정보를 확인하지 못했습니다.',
          details: [],
        },
      });
    }

    return {
      providerUserId: String(body.id),
      nickname:
        normalizeOptionalString(body.kakao_account?.profile?.nickname) ??
        normalizeOptionalString(body.properties?.nickname) ??
        normalizeOptionalString(body.kakao_account?.name),
      email: normalizeOptionalString(body.kakao_account?.email),
    };
  }

  private async findOrCreateKakaoStudent(kakaoUser: KakaoUserInfo): Promise<KakaoStudentRow> {
    const existing = await this.findKakaoStudent(kakaoUser.providerUserId);
    if (existing) return this.updateKakaoStudentProfileIfNeeded(existing, kakaoUser);

    const pool = this.databaseService.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const name = kakaoUser.nickname ?? KAKAO_STUDENT_FALLBACK_NAME;
      const loginId = `kakao:${kakaoUser.providerUserId}`;
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (
           login_id,
           name,
           email,
           password_hash,
           role,
           auth_provider,
           provider_user_id,
           status
         )
         VALUES ($1, $2, $3, $4, 'student', 'kakao', $5, 'active')
         RETURNING id`,
        [
          loginId,
          name,
          kakaoUser.email,
          'kakao-oauth-disabled',
          kakaoUser.providerUserId,
        ],
      );
      const userId = userResult.rows[0].id;
      const studentResult = await client.query<{ id: string }>(
        `INSERT INTO students (
           user_id,
           cohort_id,
           status,
           enrolled_on
         )
         VALUES ($1, NULL, 'pending', NULL)
         RETURNING id`,
        [userId],
      );

      await client.query('COMMIT');

      return {
        user_id: userId,
        login_id: loginId,
        name,
        email: kakaoUser.email,
        user_status: 'active',
        student_id: studentResult.rows[0].id,
        cohort_id: null,
        student_status: 'pending',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      const raceWinner = await this.findKakaoStudent(kakaoUser.providerUserId);
      if (raceWinner) return raceWinner;
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateKakaoStudentProfileIfNeeded(
    student: KakaoStudentRow,
    kakaoUser: KakaoUserInfo,
  ): Promise<KakaoStudentRow> {
    const nextName =
      student.name === KAKAO_STUDENT_FALLBACK_NAME && kakaoUser.nickname
        ? kakaoUser.nickname
        : null;
    const nextEmail = !student.email && kakaoUser.email ? kakaoUser.email : null;

    if (!nextName && !nextEmail) {
      return student;
    }

    await this.databaseService.getPool().query(
      `UPDATE users
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           updated_at = now()
       WHERE id = $1
         AND role = 'student'
         AND auth_provider = 'kakao'
         AND deleted_at IS NULL`,
      [student.user_id, nextName, nextEmail],
    );

    return (await this.findKakaoStudent(kakaoUser.providerUserId)) ?? student;
  }

  private async findKakaoStudent(providerUserId: string): Promise<KakaoStudentRow | null> {
    const result = await this.databaseService.getPool().query<KakaoStudentRow>(
      `SELECT
         users.id AS user_id,
         users.login_id,
         users.name,
         users.email,
         users.status AS user_status,
         students.id AS student_id,
         students.cohort_id,
         students.status AS student_status
       FROM users
       JOIN students
         ON students.user_id = users.id
        AND students.deleted_at IS NULL
       WHERE users.role = 'student'
         AND users.auth_provider = 'kakao'
         AND users.provider_user_id = $1
         AND users.deleted_at IS NULL
       LIMIT 1`,
      [providerUserId],
    );

    return result.rows[0] ?? null;
  }

  private toStudentStatusResponse(status: StudentApprovalStatus, student: KakaoStudentRow) {
    return {
      data: {
        status,
        student: {
          id: student.student_id,
          name: student.name,
          email: student.email,
          cohortId: student.cohort_id,
          status,
        },
      },
    };
  }

  private getKakaoClientId(): string {
    const clientId = this.configService.get<string>('KAKAO_REST_API_KEY');

    if (!clientId) {
      throw new InternalServerErrorException({
        error: {
          code: 'KAKAO_CONFIG_MISSING',
          message: '카카오 로그인 설정이 완료되지 않았습니다.',
          details: [],
        },
      });
    }

    return clientId;
  }

  private assertAllowedKakaoRedirectUri(redirectUri: string): void {
    const allowedRedirectUris = this.getKakaoAllowedRedirectUris();

    if (!allowedRedirectUris.includes(redirectUri)) {
      throw new BadRequestException(INVALID_KAKAO_REDIRECT_URI_RESPONSE);
    }
  }

  private assertValidOAuthState(state: string): void {
    if (!state?.trim()) {
      throw new BadRequestException({
        error: {
          code: 'KAKAO_OAUTH_STATE_REQUIRED',
          message: '카카오 로그인 state 값이 필요합니다.',
          details: [],
        },
      });
    }
  }

  private getKakaoAllowedRedirectUris(): string[] {
    const configuredValue = this.configService.get<string>('KAKAO_ALLOWED_REDIRECT_URIS');
    const allowedRedirectUris = configuredValue
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

    if (allowedRedirectUris.length === 0) {
      throw new InternalServerErrorException({
        error: {
          code: 'KAKAO_REDIRECT_URI_ALLOWLIST_MISSING',
          message: '카카오 Redirect URI 허용 목록이 설정되지 않았습니다.',
          details: [],
        },
      });
    }

    return allowedRedirectUris;
  }

  private async findUser(identifier: string, role: LoginRole): Promise<LoginUserRow | null> {
    const profileJoin =
      role === 'teacher'
        ? `JOIN teachers profile
             ON profile.user_id = users.id
            AND profile.deleted_at IS NULL`
        : `JOIN students profile
             ON profile.user_id = users.id
            AND profile.deleted_at IS NULL`;
    const cohortColumn = role === 'student' ? 'profile.cohort_id' : 'NULL::uuid';

    const result = await this.databaseService.getPool().query<LoginUserRow>(
      `SELECT
         users.id,
         users.login_id,
         users.name,
         users.email,
         users.password_hash,
         users.role,
         profile.id AS profile_id,
         ${cohortColumn} AS cohort_id
       FROM users
       ${profileJoin}
       WHERE users.role = $1
         AND users.status = 'active'
         AND users.deleted_at IS NULL
         AND (
           users.login_id = $2
           OR LOWER(users.email) = LOWER($2)
         )
       LIMIT 1`,
      [role, identifier],
    );

    return result.rows[0] ?? null;
  }

  private throwInvalidCredentials(): never {
    throw new UnauthorizedException(INVALID_CREDENTIALS_RESPONSE);
  }
}
