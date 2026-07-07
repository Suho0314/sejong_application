import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateSubmissionAnswerDto {
  @IsString()
  workbookQuestionId!: string;

  @IsOptional()
  @IsString()
  selectedChoiceId?: string | null;
}

export class CreateSubmissionDto {
  @IsString()
  assignmentId!: string;

  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSubmissionAnswerDto)
  answers!: CreateSubmissionAnswerDto[];
}
