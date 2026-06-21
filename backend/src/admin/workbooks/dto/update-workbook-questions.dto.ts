import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkbookQuestionDto } from './workbook-question.dto';

export class UpdateWorkbookQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkbookQuestionDto)
  questions!: WorkbookQuestionDto[];
}
