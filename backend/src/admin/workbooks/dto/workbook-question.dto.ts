import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WorkbookQuestionDto {
  @IsString()
  questionId!: string;

  @IsInt()
  @Min(1)
  sequence!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  points?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
