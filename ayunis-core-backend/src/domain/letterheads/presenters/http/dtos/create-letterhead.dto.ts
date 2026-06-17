import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  // Structural validation is handled by parseMargins() in the controller.
  @ApiProperty({
    type: String,
    description: 'JSON string of { top, bottom, left, right } margins in mm',
  })
  @IsString()
  @IsNotEmpty()
  firstPageMargins: string;

  @ApiProperty({
    type: String,
    description: 'JSON string of { top, bottom, left, right } margins in mm',
  })
  @IsString()
  @IsNotEmpty()
  continuationPageMargins: string;
}
