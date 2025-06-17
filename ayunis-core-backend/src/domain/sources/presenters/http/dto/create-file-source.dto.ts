import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class CreateFileSourceDto {
  @ApiProperty({
    description: 'Thread ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  threadId?: UUID;

  // Note: file data will be handled through file upload
}
