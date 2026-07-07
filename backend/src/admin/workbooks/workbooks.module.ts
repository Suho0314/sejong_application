import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { WorkbooksController } from './workbooks.controller';
import { WorkbooksService } from './workbooks.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [WorkbooksController],
  providers: [WorkbooksService, JwtAuthGuard, RolesGuard],
})
export class WorkbooksModule {}
