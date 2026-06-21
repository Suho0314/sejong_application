import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { AccessTokenPayload, LoginRole, LoginUserRow } from './auth.types';

const INVALID_CREDENTIALS_RESPONSE = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: '로그인 정보가 올바르지 않습니다.',
    details: [],
  },
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  loginTeacher(credentials: LoginDto) {
    return this.login(credentials, 'teacher');
  }

  loginStudent(credentials: LoginDto) {
    return this.login(credentials, 'student');
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
