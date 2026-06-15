import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderChaptersRequestDto {
  @ApiProperty({
    description:
      'All chapter ids in their new order. Must contain exactly the ids of all existing chapters.',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  chapterIds: UUID[];
}
