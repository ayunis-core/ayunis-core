import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreatePermittedModelDto {
  @ApiProperty({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  modelId: UUID;

  @ApiProperty({
    description: 'Whether this model should enforce anonymous mode',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  anonymousOnly?: boolean;
}
