import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { FavoriteReferenceType } from '../../../domain/value-objects/favorite-reference-type.enum';

class FavoriteResponseDtoBase {
  @ApiProperty({ format: 'uuid' })
  id: UUID;

  @ApiProperty({ minimum: 0 })
  position: number;

  @ApiProperty({ format: 'uuid' })
  referenceId: UUID;
}

export class WorkspaceFavoriteResponseDto extends FavoriteResponseDtoBase {
  @ApiProperty({ enum: [FavoriteReferenceType.Workspace] })
  referenceType: FavoriteReferenceType.Workspace;

  @ApiProperty()
  name: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;
}

export class ThreadFavoriteResponseDto extends FavoriteResponseDtoBase {
  @ApiProperty({ enum: [FavoriteReferenceType.Thread] })
  referenceType: FavoriteReferenceType.Thread;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  workspaceId: UUID | null;
}

export type FavoriteResponseDto =
  WorkspaceFavoriteResponseDto | ThreadFavoriteResponseDto;
