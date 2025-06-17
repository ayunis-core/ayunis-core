import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { UUID } from 'crypto';

export class CreateUrlSourceDto {
  @ApiProperty({
    description: 'Thread ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  threadId?: UUID;

  @ApiProperty({
    description: 'URL to create source from',
    example: 'https://example.com/document',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
