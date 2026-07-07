import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AccessTokenPayload } from '../auth.types';
import { DatabaseService } from '../../database/database.service';

export type AuthenticatedRequest = Request & {
  user?: AccessTokenPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    try {
      request.user = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (request.user.tokenUse) {
        throw new UnauthorizedException({
          error: {
            code: 'INVALID_TOKEN',
            message: '유효하지 않은 인증 토큰입니다.',
            details: [],
          },
        });
      }

      if (request.user.role === 'student') {
        await this.assertApprovedStudent(request.user);
      }

      return true;
    } catch {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 인증 토큰입니다.',
          details: [],
        },
      });
    }
  }

  private async assertApprovedStudent(user: AccessTokenPayload): Promise<void> {
    const result = await this.databaseService.getPool().query<{
      student_id: string;
      status: 'pending' | 'approved' | 'rejected' | 'suspended';
      cohort_id: string | null;
      user_status: 'active' | 'inactive';
    }>(
      `SELECT
         students.id AS student_id,
         students.status,
         students.cohort_id,
         users.status AS user_status
       FROM users
       JOIN students
         ON students.user_id = users.id
        AND students.deleted_at IS NULL
       WHERE users.id = $1
         AND users.role = 'student'
         AND users.deleted_at IS NULL
       LIMIT 1`,
      [user.sub],
    );
    const student = result.rows[0];

    if (!student) {
      throw new UnauthorizedException({
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: '학생 계정을 찾을 수 없습니다.',
          details: [],
        },
      });
    }

    if (student.user_status !== 'active' || student.status === 'suspended') {
      throw new UnauthorizedException({
        error: {
          code: 'STUDENT_SUSPENDED',
          message: '이용이 중지된 학생 계정입니다.',
          details: [],
        },
      });
    }

    if (student.status === 'pending') {
      throw new UnauthorizedException({
        error: {
          code: 'STUDENT_PENDING_APPROVAL',
          message: '강사 승인 대기 중입니다.',
          details: [],
        },
      });
    }

    if (student.status === 'rejected') {
      throw new UnauthorizedException({
        error: {
          code: 'STUDENT_REJECTED',
          message: '가입 승인이 거절된 학생 계정입니다.',
          details: [],
        },
      });
    }

    if (student.status !== 'approved' || !student.cohort_id) {
      throw new UnauthorizedException({
        error: {
          code: 'STUDENT_NOT_APPROVED',
          message: '승인된 학생만 이용할 수 있습니다.',
          details: [],
        },
      });
    }

    if (user.profileId && user.profileId !== student.student_id) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_TOKEN',
          message: '유효하지 않은 인증 토큰입니다.',
          details: [],
        },
      });
    }
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
