import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { MEMORY_CONTENT_MAX_LENGTH } from 'src/domain/memory/domain/memory.constants';

export class UpsertMemoryEntryDto {
  @ApiProperty({
    description: 'The snippet to store under this key',
    example: 'Works in the building authority of the city of Musterstadt.',
    maxLength: MEMORY_CONTENT_MAX_LENGTH,
  })
  @IsString()
  @MaxLength(MEMORY_CONTENT_MAX_LENGTH)
  content: string;
}
