import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Human-readable name for the API key',
    example: 'CI bot',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional plain-text description of what the key is used for',
    example: 'OptiGov connector, server portal-01',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Optional expiration date for the API key (ISO 8601). If omitted, the key never expires.',
    example: '2026-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
