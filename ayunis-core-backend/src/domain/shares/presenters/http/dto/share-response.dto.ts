import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';

/**
 * Generic response DTO for shares
 * Works for any entity type (agent, prompt, etc.)
 */
export class ShareResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the share',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'Type of entity being shared',
    enum: SharedEntityType,
  })
  entityType: SharedEntityType;

  @ApiProperty({
    description: 'ID of the entity being shared',
    format: 'uuid',
  })
  entityId: UUID;

  @ApiProperty({
    description: 'Type of share scope (organization or user)',
    enum: ShareScopeType,
  })
  scopeType: ShareScopeType;

  @ApiProperty({
    description: 'ID of the user who created the share',
    format: 'uuid',
  })
  ownerId: UUID;

  @ApiProperty({
    description: 'When the share was created',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the share was last updated',
    format: 'date-time',
  })
  updatedAt: Date;
}
