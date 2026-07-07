import { IsIn, IsOptional } from 'class-validator';
import { QuestionStatus } from '../question.types';

const STATUSES: QuestionStatus[] = ['draft', 'published', 'archived'];

export class ListQuestionFilterOptionsDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: QuestionStatus;
}
