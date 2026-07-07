import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCohortDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  startsOn?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  endsOn?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
