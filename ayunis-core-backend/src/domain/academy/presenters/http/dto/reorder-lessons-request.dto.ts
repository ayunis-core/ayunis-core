import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderLessonsRequestDto {
  @ApiProperty({
    description:
      'All lesson ids of the chapter in their new order. Must contain exactly the ids of all lessons in the chapter.',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  lessonIds: UUID[];
}
