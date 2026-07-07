import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApproveStudentDto } from './dto/approve-student.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  listStudents(@Query() query: ListStudentsDto) {
    return this.studentsService.listStudents(query);
  }

  @Get(':studentId')
  getStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentsService.getStudent(studentId);
  }

  @Post()
  createStudent(@Body() body: CreateStudentDto) {
    return this.studentsService.createStudent(body);
  }

  @Patch(':studentId')
  updateStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() body: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(studentId, body);
  }

  @Patch(':studentId/approve')
  approveStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() body: ApproveStudentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.studentsService.approveStudent(studentId, body, request.user?.sub);
  }

  @Patch(':studentId/reject')
  rejectStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentsService.rejectStudent(studentId);
  }

  @Patch(':studentId/suspend')
  suspendStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.studentsService.suspendStudent(studentId);
  }

  @Delete(':studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    await this.studentsService.deleteStudent(studentId);
  }
}
