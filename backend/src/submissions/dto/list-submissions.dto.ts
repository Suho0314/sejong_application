import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SubmissionStatus } from '../submission.types';

const STATUSES: SubmissionStatus[] = ['in_progress', 'submitted', 'graded'];

export class ListSubmissionsDto {
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: SubmissionStatus;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
