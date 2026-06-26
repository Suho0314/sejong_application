import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { KakaoAuthorizeQueryDto, KakaoCallbackDto } from './dto/kakao-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('teacher/login')
  @HttpCode(HttpStatus.OK)
  loginTeacher(@Body() credentials: LoginDto) {
    return this.authService.loginTeacher(credentials);
  }

  @Get('student/kakao/authorize')
  @HttpCode(HttpStatus.OK)
  getKakaoAuthorizeUrl(@Query() query: KakaoAuthorizeQueryDto) {
    return this.authService.getKakaoAuthorizeUrl(query.redirectUri, query.state);
  }

  @Post('student/kakao/callback')
  @HttpCode(HttpStatus.OK)
  loginStudentWithKakao(@Body() body: KakaoCallbackDto) {
    return this.authService.loginStudentWithKakao(body.code, body.redirectUri, body.state);
  }
}
