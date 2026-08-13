import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderFavoritesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  favoriteIds: UUID[];
}
