import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'New name for the API key. Omit to keep the current name.',
    example: 'Citizen portal',
    maxLength: 100,
  })
  // ValidateIf instead of IsOptional so an explicit null is rejected.
  @ValidateIf((dto: UpdateApiKeyDto) => dto.name !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Plain-text description of what the key is used for. Omit to keep it, send null or an empty string to remove it.',
    example: 'OptiGov connector, server portal-01',
    maxLength: 500,
    type: String,
    nullable: true,
  })
  @ValidateIf(
    (dto: UpdateApiKeyDto) =>
      dto.description !== undefined && dto.description !== null,
  )
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'New expiry date (ISO 8601, must be in the future). Omit to keep it, send null to let the key never expire.',
    example: '2026-12-31T23:59:59.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @ValidateIf(
    (dto: UpdateApiKeyDto) =>
      dto.expiresAt !== undefined && dto.expiresAt !== null,
  )
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}
