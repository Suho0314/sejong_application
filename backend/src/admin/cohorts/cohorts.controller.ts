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
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CohortsService } from './cohorts.service';
import { CreateCohortDto } from './dto/create-cohort.dto';
import { ListCohortsDto } from './dto/list-cohorts.dto';
import { UpdateCohortDto } from './dto/update-cohort.dto';

@Controller('admin/cohorts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'teacher')
export class CohortsController {
  constructor(private readonly cohortsService: CohortsService) {}

  @Get()
  listCohorts(@Query() query: ListCohortsDto) {
    return this.cohortsService.listCohorts(query);
  }

  @Get(':cohortId')
  getCohort(@Param('cohortId', ParseUUIDPipe) cohortId: string) {
    return this.cohortsService.getCohort(cohortId);
  }

  @Post()
  createCohort(@Body() body: CreateCohortDto) {
    return this.cohortsService.createCohort(body);
  }

  @Patch(':cohortId')
  updateCohort(
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Body() body: UpdateCohortDto,
  ) {
    return this.cohortsService.updateCohort(cohortId, body);
  }

  @Delete(':cohortId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCohort(@Param('cohortId', ParseUUIDPipe) cohortId: string) {
    await this.cohortsService.deleteCohort(cohortId);
  }
}
