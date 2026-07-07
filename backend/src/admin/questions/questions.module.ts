import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { QuestionsController } from './questions.controller';
import { QuestionPdfImportService } from './question-pdf-import.service';
import { QuestionsService } from './questions.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionPdfImportService, JwtAuthGuard, RolesGuard],
})
export class QuestionsModule {}
