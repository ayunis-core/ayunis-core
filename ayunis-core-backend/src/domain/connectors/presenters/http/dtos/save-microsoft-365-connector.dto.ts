import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { GUID_PATTERN } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** A blank secret counts as empty; any other secret is kept as entered. */
const blankToEmpty = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? '' : value;

export class SaveMicrosoft365ConnectorDto {
  @ApiProperty({
    description: 'Directory (tenant) ID of the Entra tenant',
    example: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  })
  @Transform(trim)
  @IsString()
  @Matches(GUID_PATTERN)
  tenantId: string;

  @ApiProperty({
    description: 'Application (client) ID of the Entra app registration',
    example: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
  })
  @Transform(trim)
  @IsString()
  @Matches(GUID_PATTERN)
  clientId: string;

  @ApiPropertyOptional({
    description:
      'Value of a client secret of the app registration. Required to set up the connection; omit it to keep the stored secret. Never returned.',
    writeOnly: true,
    maxLength: 1024,
  })
  // Only an omitted secret keeps the stored one; null is rejected.
  @ValidateIf(
    (dto: SaveMicrosoft365ConnectorDto) => dto.clientSecret !== undefined,
  )
  @Transform(blankToEmpty)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  clientSecret?: string;
}
