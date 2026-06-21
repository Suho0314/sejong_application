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
import { AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsDto } from './dto/list-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('admin/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  listQuestions(@Query() query: ListQuestionsDto) {
    return this.questionsService.listQuestions(query);
  }

  @Get(':questionId')
  getQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.questionsService.getQuestion(questionId);
  }

  @Post()
  createQuestion(@Body() body: CreateQuestionDto, @Req() request: AuthenticatedRequest) {
    return this.questionsService.createQuestion(body, request.user?.sub);
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
