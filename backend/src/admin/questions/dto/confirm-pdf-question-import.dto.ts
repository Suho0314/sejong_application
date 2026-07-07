import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuestionDifficulty } from '../question.types';

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

export class ConfirmPdfQuestionDraftDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  questionNumber?: number;

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

  @IsString()
  content!: string;

  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  choices!: string[];

  @IsInt()
  @Min(0)
  @Max(4)
  correctAnswerIndex!: number;
}

export class ConfirmPdfQuestionImportDto {
  @IsBoolean()
  permissionConfirmed!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConfirmPdfQuestionDraftDto)
  questions!: ConfirmPdfQuestionDraftDto[];
}
