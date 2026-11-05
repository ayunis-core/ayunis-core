import { ApiProperty } from '@nestjs/swagger';

export class MemoryEntryResponseDto {
  @ApiProperty({
    description: 'The key the snippet is stored under',
    example: 'personal',
  })
  key: string;

  @ApiProperty({
    description: 'The stored snippet. Empty for a reserved key with no content',
    example: 'Works in the building authority of the city of Musterstadt.',
  })
  content: string;

  @ApiProperty({
    description:
      'One line on when the entry is relevant; null when none was given. Reserved keys never have one',
    nullable: true,
    type: String,
    example: 'How the user wants monthly council reports structured.',
  })
  description: string | null;

  @ApiProperty({
    description:
      'Whether this key is always offered to the assistant and cannot be removed',
    example: true,
  })
  isReserved: boolean;

  @ApiProperty({
    description: 'When the snippet was last written, or null if it has none',
    nullable: true,
    type: String,
    format: 'date-time',
  })
  updatedAt: string | null;
}
