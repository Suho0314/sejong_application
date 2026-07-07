import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WorkbookStatus } from '../workbook.types';

const STATUSES: WorkbookStatus[] = ['draft', 'published', 'archived'];

export class ListWorkbooksDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: WorkbookStatus;

  @IsOptional()
  @IsString()
  keyword?: string;

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
