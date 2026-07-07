import { IsUUID } from 'class-validator';

export class ApproveStudentDto {
  @IsUUID()
  cohortId!: string;
}
