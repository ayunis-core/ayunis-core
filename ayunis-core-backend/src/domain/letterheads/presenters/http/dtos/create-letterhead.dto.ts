import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageMarginsDto } from './page-margins.dto';

export class CreateLetterheadDto {
  @ApiProperty({
    description: 'Name of the letterhead',
    example: 'Stadtverwaltung Musterstadt',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the letterhead (used by AI for context)',
    example: 'Offizielles Briefpapier der Stadtverwaltung',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Margins arrive as JSON strings in multipart requests.
  // Validation is handled by parseMargins() in the controller.
  @ApiProperty({
    description: 'Margins for the first page in mm (JSON string)',
    type: PageMarginsDto,
    default: { top: 20, bottom: 20, left: 20, right: 20 },
  })
  firstPageMargins: unknown;

  @ApiProperty({
    description: 'Margins for continuation pages in mm (JSON string)',
    type: PageMarginsDto,
    default: { top: 20, bottom: 20, left: 20, right: 20 },
  })
  continuationPageMargins: unknown;
}
