import { Injectable } from '@nestjs/common';
import { Share, AgentShare } from '../../../domain/share.entity';
import { ShareResponseDto } from '../dto/share-response.dto';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Mapper for converting Share entities to generic DTOs
 */
@Injectable()
export class ShareDtoMapper {
  /**
   * Convert a Share entity to a generic DTO
   * @param share - Share entity to convert
   * @returns Generic ShareResponseDto
   */
  toDto(share: Share): ShareResponseDto {
    const dto = new ShareResponseDto();

    // Map common fields
    dto.id = share.id;
    dto.entityType = share.entityType;
    dto.scopeType = share.scope.scopeType;
    dto.ownerId = share.ownerId;
    dto.createdAt = share.createdAt;
    dto.updatedAt = share.updatedAt;

    // Map entity-specific ID based on entity type
    if (share.entityType === SharedEntityType.AGENT) {
      dto.entityId = (share as AgentShare).agentId;
    }
    // Future: Add other entity types
    // else if (share.entityType === SharedEntityType.PROMPT) {
    //   dto.entityId = (share as PromptShare).promptId;
    // }
    else {
      // Fallback for unknown types (should not happen in practice)
      throw new Error(
        `Unknown entity type for share mapping: ${share.entityType}`,
      );
    }

    return dto;
  }

  /**
   * Convert multiple Share entities to DTOs
   * @param shares - Array of Share entities
   * @returns Array of ShareResponseDto
   */
  toDtoArray(shares: Share[]): ShareResponseDto[] {
    return shares.map((share) => this.toDto(share));
  }
}
