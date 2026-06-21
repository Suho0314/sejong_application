import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkbookAssignmentStatus } from '../workbook-assignment.types';

const STATUSES: WorkbookAssignmentStatus[] = ['scheduled', 'open', 'closed'];

export class ListWorkbookAssignmentsDto {
  @IsOptional()
  @IsString()
  workbookId?: string;

  @IsOptional()
  @IsString()
  cohortId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: WorkbookAssignmentStatus;

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
