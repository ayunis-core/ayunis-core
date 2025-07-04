import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateThreadModelDto {
  @ApiProperty({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  modelId: UUID;
}
