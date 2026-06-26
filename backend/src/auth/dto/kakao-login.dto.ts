import { IsString, MaxLength } from 'class-validator';

export class KakaoAuthorizeQueryDto {
  @IsString()
  @MaxLength(500)
  redirectUri!: string;

  @IsString()
  @MaxLength(200)
  state!: string;
}

export class KakaoCallbackDto {
  @IsString()
  @MaxLength(500)
  code!: string;

  @IsString()
  @MaxLength(500)
  redirectUri!: string;

  @IsString()
  @MaxLength(200)
  state!: string;
}
