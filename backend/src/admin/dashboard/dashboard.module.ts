import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [DashboardController],
  providers: [DashboardService, JwtAuthGuard, RolesGuard],
})
export class DashboardModule {}
