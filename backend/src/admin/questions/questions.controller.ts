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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BulkUpdateQuestionCategoryDto } from './dto/bulk-update-question-category.dto';
import { BulkUpdateQuestionStatusDto } from './dto/bulk-update-question-status.dto';
import { ConfirmPdfQuestionImportDto } from './dto/confirm-pdf-question-import.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsDto } from './dto/list-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionPdfImportService } from './question-pdf-import.service';
import { QuestionsService } from './questions.service';

type UploadedPdfFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size: number;
};

type PdfImportFiles = {
  questionPdf?: UploadedPdfFile[];
  answerPdf?: UploadedPdfFile[];
};

@Controller('admin/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly questionPdfImportService: QuestionPdfImportService,
  ) {}

  @Get()
  listQuestions(@Query() query: ListQuestionsDto) {
    return this.questionsService.listQuestions(query);
  }

  @Get('categories')
  listCategories() {
    return this.questionsService.listCategories();
  }

  @Get('filter-options')
  listFilterOptions() {
    return this.questionsService.listFilterOptions();
  }

  @Get(':questionId')
  getQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.questionsService.getQuestion(questionId);
  }

  @Post()
  createQuestion(@Body() body: CreateQuestionDto, @Req() request: AuthenticatedRequest) {
    return this.questionsService.createQuestion(body, request.user?.sub);
  }

  @Post('pdf-import/preview')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'questionPdf', maxCount: 1 },
    { name: 'answerPdf', maxCount: 1 },
  ]))
  previewPdfImport(@UploadedFiles() files: PdfImportFiles) {
    return this.questionPdfImportService.preview(files.questionPdf?.[0], files.answerPdf?.[0]);
  }

  @Post('pdf-import/confirm')
  confirmPdfImport(
    @Body() body: ConfirmPdfQuestionImportDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.questionPdfImportService.confirm(body, request.user?.sub);
  }

  @Patch('bulk/category')
  bulkUpdateQuestionCategory(@Body() body: BulkUpdateQuestionCategoryDto) {
    return this.questionsService.bulkUpdateQuestionCategory(body);
  }

  @Patch('bulk/status')
  bulkUpdateQuestionStatus(@Body() body: BulkUpdateQuestionStatusDto) {
    return this.questionsService.bulkUpdateQuestionStatus(body);
  }

  @Patch(':questionId')
  updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() body: UpdateQuestionDto,
  ) {
    return this.questionsService.updateQuestion(questionId, body);
  }

  @Delete(':questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    await this.questionsService.deleteQuestion(questionId);
  }
}
