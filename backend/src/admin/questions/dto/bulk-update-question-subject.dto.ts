import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class BulkUpdateQuestionSubjectDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  questionIds!: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject!: string;
}
