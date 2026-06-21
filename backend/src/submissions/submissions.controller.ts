import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ListStudentAssignmentsDto } from './dto/list-student-assignments.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { SubmissionsService } from './submissions.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('student/assignments')
  @Roles('student')
  listStudentAssignments(
    @Query() query: ListStudentAssignmentsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.listStudentAssignments(query, request.user?.sub);
  }

  @Get('student/assignments/:assignmentId')
  @Roles('student')
  getStudentAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.getStudentAssignment(assignmentId, request.user?.sub);
  }

  @Post('student/submissions')
  @Roles('student')
  createStudentSubmission(
    @Body() body: CreateSubmissionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.createStudentSubmission(body, request.user?.sub);
  }

  @Get('student/submissions')
  @Roles('student')
  listStudentSubmissions(
    @Query() query: ListSubmissionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.listStudentSubmissions(query, request.user?.sub);
  }

  @Get('student/submissions/:submissionId')
  @Roles('student')
  getStudentSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.submissionsService.getStudentSubmission(submissionId, request.user?.sub);
  }

  @Get('admin/submissions')
  @Roles('admin', 'teacher')
  listAdminSubmissions(@Query() query: ListSubmissionsDto) {
    return this.submissionsService.listAdminSubmissions(query);
  }

  @Get('admin/submissions/:submissionId')
  @Roles('admin', 'teacher')
  getAdminSubmission(@Param('submissionId', ParseUUIDPipe) submissionId: string) {
    return this.submissionsService.getAdminSubmission(submissionId);
  }
}

