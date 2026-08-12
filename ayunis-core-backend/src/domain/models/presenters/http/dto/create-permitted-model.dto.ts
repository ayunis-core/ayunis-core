import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { IsUUID } from 'class-validator';
import { BaseCreatePermittedModelDto } from './base-create-permitted-model.dto';

export class CreatePermittedModelDto extends BaseCreatePermittedModelDto {
  @ApiProperty({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  modelId: UUID;
}
