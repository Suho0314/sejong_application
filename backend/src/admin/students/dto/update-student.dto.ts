import { IsEmail, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { StudentStatus } from '../student.types';

const STUDENT_STATUSES: StudentStatus[] = ['pending', 'approved', 'rejected', 'suspended'];

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsUUID()
  cohortId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentNo?: string | null;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  birthDate?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  enrolledOn?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  completedOn?: string | null;

  @IsOptional()
  @IsString()
  memo?: string | null;
}
