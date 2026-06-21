import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StudentStatus } from '../student.types';

const STUDENT_STATUSES: StudentStatus[] = ['active', 'inactive', 'paused', 'graduated'];

export class CreateStudentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(80)
  loginId!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsUUID()
  cohortId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentNo?: string | null;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;

  @IsISO8601({ strict: true })
  enrolledOn!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  completedOn?: string | null;

  @IsOptional()
  @IsString()
  memo?: string | null;
}
