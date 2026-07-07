import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsUUID } from 'class-validator';
import { QuestionStatus } from '../question.types';

const STATUSES: QuestionStatus[] = ['draft', 'published', 'archived'];

export class BulkUpdateQuestionStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  questionIds!: string[];

  @IsIn(STATUSES)
  status!: QuestionStatus;
}
