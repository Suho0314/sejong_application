import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { WorkbookAssignmentsController } from './workbook-assignments.controller';
import { WorkbookAssignmentsService } from './workbook-assignments.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [WorkbookAssignmentsController],
  providers: [WorkbookAssignmentsService, JwtAuthGuard, RolesGuard],
})
export class WorkbookAssignmentsModule {}
