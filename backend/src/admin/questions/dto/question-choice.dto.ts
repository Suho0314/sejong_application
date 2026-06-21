import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class QuestionChoiceDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(1000)
  text!: string;
}
