import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { KakaoAuthorizeQueryDto, KakaoCallbackDto } from './dto/kakao-login.dto';
import { ChangeTeacherPasswordDto, UpdateTeacherAccountDto } from './dto/account-settings.dto';
import { Roles } from './decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('teacher/login')
  @HttpCode(HttpStatus.OK)
  loginTeacher(@Body() credentials: LoginDto) {
    return this.authService.loginTeacher(credentials);
  }



  @Get('teacher/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  getTeacherAccount(@Req() request: AuthenticatedRequest) {
    return this.authService.getTeacherAccount(request.user?.sub);
  }

  @Patch('teacher/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  updateTeacherAccount(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateTeacherAccountDto,
  ) {
    return this.authService.updateTeacherAccount(request.user?.sub, body);
  }

  @Patch('teacher/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  changeTeacherPassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangeTeacherPasswordDto,
  ) {
    return this.authService.changeTeacherPassword(request.user?.sub, body);
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
