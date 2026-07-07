import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AssignmentStatus } from '../submission.types';

const STATUSES: AssignmentStatus[] = ['scheduled', 'open', 'closed'];

export class ListStudentAssignmentsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: AssignmentStatus;

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

