import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { IsEnum, IsUUID } from 'class-validator';
import { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';

export class ToggleFavoriteDto {
  @ApiProperty({ enum: FavoriteReferenceType })
  @IsEnum(FavoriteReferenceType)
  referenceType: FavoriteReferenceType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  referenceId: UUID;
}
