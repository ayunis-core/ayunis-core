import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { UUID } from 'crypto';

export class CreateTrialRequestDto {
  @ApiProperty({
    description: 'Organization ID for which to create the trial',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  orgId: UUID;

  @ApiProperty({
    description: 'Maximum number of messages allowed in the trial',
    example: 1000,
    minimum: 1,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  maxMessages: number;
}
