import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_DESCRIPTION_MAX_LENGTH,
} from 'src/domain/memory/domain/memory.constants';

export class UpsertMemoryEntryDto {
  @ApiProperty({
    description: 'The snippet to store under this key',
    example: 'Works in the building authority of the city of Musterstadt.',
    maxLength: MEMORY_CONTENT_MAX_LENGTH,
  })
  @IsString()
  @MaxLength(MEMORY_CONTENT_MAX_LENGTH)
  content: string;

  @ApiPropertyOptional({
    description:
      'One line on when this entry is relevant. Omit to keep the stored description, send an empty string or null to clear it',
    example: 'How the user wants monthly council reports structured.',
    maxLength: MEMORY_DESCRIPTION_MAX_LENGTH,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(MEMORY_DESCRIPTION_MAX_LENGTH)
  description?: string | null;
}
