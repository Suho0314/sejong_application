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
import { CreateWorkbookAssignmentDto } from './dto/create-workbook-assignment.dto';
import { ListWorkbookAssignmentsDto } from './dto/list-workbook-assignments.dto';
import { UpdateWorkbookAssignmentDto } from './dto/update-workbook-assignment.dto';
import { WorkbookAssignmentsService } from './workbook-assignments.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class WorkbookAssignmentsController {
  constructor(private readonly workbookAssignmentsService: WorkbookAssignmentsService) {}

  @Get('admin/workbook-assignments')
  listAssignments(@Query() query: ListWorkbookAssignmentsDto) {
    return this.workbookAssignmentsService.listAssignments(query);
  }

  @Get('admin/workbook-assignments/:assignmentId')
  getAssignment(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.workbookAssignmentsService.getAssignment(assignmentId);
  }

  @Post('admin/workbooks/:workbookId/assignments')
  createAssignment(
    @Param('workbookId', ParseUUIDPipe) workbookId: string,
    @Body() body: CreateWorkbookAssignmentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workbookAssignmentsService.createAssignment(workbookId, body, request.user?.sub);
  }

  @Patch('admin/workbook-assignments/:assignmentId')
  updateAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() body: UpdateWorkbookAssignmentDto,
  ) {
    return this.workbookAssignmentsService.updateAssignment(assignmentId, body);
  }

  @Delete('admin/workbook-assignments/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssignment(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    await this.workbookAssignmentsService.deleteAssignment(assignmentId);
  }
}
