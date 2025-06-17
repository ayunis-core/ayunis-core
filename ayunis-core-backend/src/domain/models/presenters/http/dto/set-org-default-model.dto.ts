import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class SetOrgDefaultModelDto {
  @ApiProperty({
    description: 'The ID of the permitted model to set as organization default',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  permittedModelId: UUID;
}
