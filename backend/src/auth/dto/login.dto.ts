import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((request: LoginDto) => !request.email)
  @IsString()
  @IsNotEmpty()
  loginId?: string;

  @ValidateIf((request: LoginDto) => !request.loginId)
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
