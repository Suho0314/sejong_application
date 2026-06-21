import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('teacher/login')
  @HttpCode(HttpStatus.OK)
  loginTeacher(@Body() credentials: LoginDto) {
    return this.authService.loginTeacher(credentials);
  }

  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  loginStudent(@Body() credentials: LoginDto) {
    return this.authService.loginStudent(credentials);
  }
}
