import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { CohortsController } from './cohorts.controller';
import { CohortsService } from './cohorts.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [CohortsController],
  providers: [CohortsService, JwtAuthGuard, RolesGuard],
})
export class CohortsModule {}
