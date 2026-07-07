import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatabaseModule } from '../database/database.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, JwtAuthGuard, RolesGuard],
})
export class SubmissionsModule {}
