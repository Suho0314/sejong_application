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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateWorkbookDto } from './dto/create-workbook.dto';
import { ListWorkbooksDto } from './dto/list-workbooks.dto';
import { UpdateWorkbookQuestionsDto } from './dto/update-workbook-questions.dto';
import { UpdateWorkbookDto } from './dto/update-workbook.dto';
import { WorkbooksService } from './workbooks.service';

@Controller('admin/workbooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class WorkbooksController {
  constructor(private readonly workbooksService: WorkbooksService) {}

  @Get()
  listWorkbooks(@Query() query: ListWorkbooksDto) {
    return this.workbooksService.listWorkbooks(query);
  }

  @Get(':workbookId')
  getWorkbook(@Param('workbookId', ParseUUIDPipe) workbookId: string) {
    return this.workbooksService.getWorkbook(workbookId);
  }

  @Post()
  createWorkbook(@Body() body: CreateWorkbookDto, @Req() request: AuthenticatedRequest) {
    return this.workbooksService.createWorkbook(body, request.user?.sub);
  }

  @Patch(':workbookId')
  updateWorkbook(
    @Param('workbookId', ParseUUIDPipe) workbookId: string,
    @Body() body: UpdateWorkbookDto,
  ) {
    return this.workbooksService.updateWorkbook(workbookId, body);
  }

  @Put(':workbookId/questions')
  updateWorkbookQuestions(
    @Param('workbookId', ParseUUIDPipe) workbookId: string,
    @Body() body: UpdateWorkbookQuestionsDto,
  ) {
    return this.workbooksService.updateWorkbookQuestions(workbookId, body);
  }

  @Delete(':workbookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkbook(@Param('workbookId', ParseUUIDPipe) workbookId: string) {
    await this.workbooksService.deleteWorkbook(workbookId);
  }
}
