import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CohortsModule } from './admin/cohorts/cohorts.module';
import { QuestionsModule } from './admin/questions/questions.module';
import { StudentsModule } from './admin/students/students.module';
import { WorkbookAssignmentsModule } from './admin/workbook-assignments/workbook-assignments.module';
import { WorkbooksModule } from './admin/workbooks/workbooks.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    AuthModule,
    CohortsModule,
    QuestionsModule,
    StudentsModule,
    WorkbookAssignmentsModule,
    WorkbooksModule,
    HealthModule,
  ],
})
export class AppModule {}
