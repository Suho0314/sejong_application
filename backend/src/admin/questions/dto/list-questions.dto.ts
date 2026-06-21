import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '../question.types';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const QUESTION_TYPES: QuestionType[] = ['multiple_choice'];
const STATUSES: QuestionStatus[] = ['draft', 'published', 'archived'];

export class ListQuestionsDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: QuestionDifficulty;

  @IsOptional()
  @IsIn(QUESTION_TYPES)
  questionType?: QuestionType;

  @IsOptional()
  @IsIn(QUESTION_TYPES)
  type?: QuestionType;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: QuestionStatus;

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
