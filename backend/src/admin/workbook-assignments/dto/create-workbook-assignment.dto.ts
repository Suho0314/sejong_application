import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';
import { WorkbookAssignmentStatus } from '../workbook-assignment.types';

const STATUSES: WorkbookAssignmentStatus[] = ['scheduled', 'open', 'closed'];

export class CreateWorkbookAssignmentDto {
  @IsString()
  cohortId!: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: WorkbookAssignmentStatus;

  @IsISO8601()
  opensAt!: string;

  @IsOptional()
  @IsISO8601()
  closesAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}
