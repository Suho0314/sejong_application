import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class WorkbookQuestionDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
