import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PageMarginsDto } from './page-margins.dto';

export class LetterheadResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the letterhead',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the letterhead',
    example: 'Stadtverwaltung Musterstadt',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the letterhead',
    example: 'Offizielles Briefpapier der Stadtverwaltung',
    nullable: true,
    type: String,
  })
  description: string | null;

  @ApiProperty({
    description: 'Margins for the first page in mm',
    type: PageMarginsDto,
  })
  firstPageMargins: PageMarginsDto;

  @ApiProperty({
    description: 'Margins for continuation pages in mm',
    type: PageMarginsDto,
  })
  continuationPageMargins: PageMarginsDto;

  @ApiProperty({
    description: 'Whether a continuation page PDF is configured',
  })
  hasContinuationPage: boolean;

  @ApiProperty({
    description: 'When the letterhead was created',
    example: '2026-01-15T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the letterhead was last updated',
    example: '2026-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}
