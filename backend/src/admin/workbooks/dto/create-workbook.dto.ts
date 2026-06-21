import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkbookStatus } from '../workbook.types';
import { WorkbookQuestionDto } from './workbook-question.dto';

const STATUSES: WorkbookStatus[] = ['draft', 'published', 'archived'];

export class CreateWorkbookDto {
  @IsString()
  @MaxLength(200)
  title!: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkbookQuestionDto)
  questions?: WorkbookQuestionDto[];
}
