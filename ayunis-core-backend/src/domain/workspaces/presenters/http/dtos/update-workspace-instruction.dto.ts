import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateWorkspaceInstructionDto {
  @ApiProperty({
    type: String,
    description: 'Instructions that apply to every chat in the workspace',
    nullable: true,
    maxLength: 10000,
  })
  @IsDefined()
  @ValidateIf((dto: UpdateWorkspaceInstructionDto) => dto.instruction !== null)
  @IsString()
  @MaxLength(10000)
  instruction: string | null;
}
