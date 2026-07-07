import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { WorkbookStatus } from '../workbook.types';

const STATUSES: WorkbookStatus[] = ['draft', 'published', 'archived'];

export class UpdateWorkbookDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(STATUSES)
  status?: WorkbookStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passScore?: number;
}
