import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StudentApprovalStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  approvalToken!: string;
}
