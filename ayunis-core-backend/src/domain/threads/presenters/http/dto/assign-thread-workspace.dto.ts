import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import type { UUID } from 'crypto';

export class AssignThreadWorkspaceDto {
  @ApiProperty({
    type: String,
    description:
      'The workspace to file this thread under. Send null to remove it from its workspace.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    nullable: true,
  })
  // @IsOptional() would also skip validation for null, which is a meaningful
  // value here — ValidateIf keeps null legal but still rejects a bogus id.
  @ValidateIf((_object, value) => value !== null)
  @IsUUID()
  workspaceId: UUID | null;
}
