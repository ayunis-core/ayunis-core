import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import { UUID } from 'crypto';

export class SetRecordingSummaryModelDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    nullable: true,
    description:
      'Org-wide permitted language model that summarizes recordings; null clears it so the org default model applies',
  })
  @ValidateIf(
    (dto: SetRecordingSummaryModelDto) => dto.permittedModelId !== null,
  )
  @IsUUID()
  permittedModelId: UUID | null;
}
