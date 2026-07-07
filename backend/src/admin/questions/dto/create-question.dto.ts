import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '../question.types';
import { QuestionChoiceDto } from './question-choice.dto';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const QUESTION_TYPES: QuestionType[] = ['multiple_choice'];
const STATUSES: QuestionStatus[] = ['draft', 'published', 'archived'];

export class CreateQuestionDto {
  @IsString()
  @MaxLength(120)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string | null;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: QuestionDifficulty;

  @IsOptional()
  @IsIn(QUESTION_TYPES)
  type?: QuestionType;

  @IsOptional()
  @IsIn(QUESTION_TYPES)
  questionType?: QuestionType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  stem?: string;

  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  choices!: Array<QuestionChoiceDto | string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  correctAnswerIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  answerKey?: number;

  @IsOptional()
  @IsIn(STATUSES)
  status?: QuestionStatus;
}
