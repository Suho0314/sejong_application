import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DatabaseModule } from '../database/database.module';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ScoresController],
  providers: [ScoresService, JwtAuthGuard, RolesGuard],
})
export class ScoresModule {}

