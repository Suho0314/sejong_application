import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export type PdfImportAiAssistMode = 'all' | 'review_only';

const toBoolean = (value: unknown) => value === true || value === 'true' || value === '1' || value === 'on';

export class PreviewPdfQuestionImportDto {
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  useAiAssist?: boolean;

  @IsOptional()
  @IsIn(['all', 'review_only'])
  aiAssistMode?: PdfImportAiAssistMode;
}
