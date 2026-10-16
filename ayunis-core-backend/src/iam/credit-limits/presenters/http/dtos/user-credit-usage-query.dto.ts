import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

// Query strings arrive as `userIds[]=a&userIds[]=b` (axios), a repeated key,
// a single value, or a comma-joined value, so normalise them all to an array.
function toIdList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .filter((part): part is string => typeof part === 'string')
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export class UserCreditUsageQueryDto {
  @ApiProperty({
    description: 'Users whose current monthly credit consumption to return',
    type: [String],
    format: 'uuid',
    example: ['550e8400-e29b-41d4-a716-446655440001'],
  })
  @Transform(({ value }: { value: unknown }) => toIdList(value))
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  userIds: UUID[];
}
