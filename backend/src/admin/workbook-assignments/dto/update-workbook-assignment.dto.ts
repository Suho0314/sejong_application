import { IsIn, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import { WorkbookAssignmentStatus } from '../workbook-assignment.types';

const STATUSES: WorkbookAssignmentStatus[] = ['scheduled', 'open', 'closed'];

export class UpdateWorkbookAssignmentDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: WorkbookAssignmentStatus;

  @IsOptional()
  @IsISO8601()
  opensAt?: string;

  @IsOptional()
  @IsISO8601()
  closesAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;
}
