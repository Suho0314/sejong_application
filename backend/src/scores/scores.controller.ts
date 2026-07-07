import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListScoresDto } from './dto/list-scores.dto';
import { ScoresService } from './scores.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Get('admin/scores')
  @Roles('admin', 'teacher')
  listAdminScores(@Query() query: ListScoresDto) {
    return this.scoresService.listScores(query);
  }

  @Get('admin/scores/students/:studentId')
  @Roles('admin', 'teacher')
  getStudentScores(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ListScoresDto,
  ) {
    return this.scoresService.getStudentScores(studentId, query);
  }

  @Get('admin/scores/workbooks/:workbookId/question-stats')
  @Roles('admin', 'teacher')
  getWorkbookQuestionStats(@Param('workbookId', ParseUUIDPipe) workbookId: string) {
    return this.scoresService.getWorkbookQuestionStats(workbookId);
  }

  @Get('admin/scores/workbooks/:workbookId')
  @Roles('admin', 'teacher')
  getWorkbookScores(
    @Param('workbookId', ParseUUIDPipe) workbookId: string,
    @Query() query: ListScoresDto,
  ) {
    return this.scoresService.getWorkbookScores(workbookId, query);
  }

  @Get('admin/scores/cohorts/:cohortId')
  @Roles('admin', 'teacher')
  getCohortScores(
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Query() query: ListScoresDto,
  ) {
    return this.scoresService.getCohortScores(cohortId, query);
  }

  @Get('student/scores')
  @Roles('student')
  listStudentScores(@Query() query: ListScoresDto, @Req() request: AuthenticatedRequest) {
    return this.scoresService.listStudentScores(query, request.user?.sub);
  }

  @Get('student/scores/:submissionId')
  @Roles('student')
  getStudentScore(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.scoresService.getStudentScore(submissionId, request.user?.sub);
  }
}
