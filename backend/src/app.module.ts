import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CohortsModule } from './admin/cohorts/cohorts.module';
import { StudentsModule } from './admin/students/students.module';
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
    StudentsModule,
    HealthModule,
  ],
})
export class AppModule {}
