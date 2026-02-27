import { Injectable } from '@nestjs/common';
import { Share } from '../../../domain/share.entity';
import { ShareResponseDto } from '../dto/share-response.dto';
import { ShareScopeType } from '../../../domain/value-objects/share-scope-type.enum';
import { TeamShareScope } from '../../../domain/share-scope.entity';

/**
 * Mapper for converting Share entities to generic DTOs
 */
@Injectable()
export class ShareDtoMapper {
  /**
   * Convert a Share entity to a generic DTO
   * @param share - Share entity to convert
   * @param teamName - Optional team name for team-scoped shares
   * @returns Generic ShareResponseDto
   */
  toDto(share: Share, teamName?: string): ShareResponseDto {
    const dto = new ShareResponseDto();

    // Map common fields
    dto.id = share.id;
    dto.entityType = share.entityType;
    dto.scopeType = share.scope.scopeType;
    dto.ownerId = share.ownerId;
    dto.createdAt = share.createdAt;
    dto.updatedAt = share.updatedAt;

    // Map team-specific fields for team scopes
    if (share.scope.scopeType === ShareScopeType.TEAM) {
      const teamScope = share.scope as TeamShareScope;
      dto.teamId = teamScope.teamId;
      dto.teamName = teamName;
    }

    // Map entity-specific ID
    dto.entityId = share.entityId;

    return dto;
  }

  /**
   * Convert multiple Share entities to DTOs
   * @param shares - Array of Share entities
   * @param teamNamesMap - Optional map of team IDs to team names for team-scoped shares
   * @returns Array of ShareResponseDto
   */
  toDtoArray(
    shares: Share[],
    teamNamesMap?: Map<string, string>,
  ): ShareResponseDto[] {
    return shares.map((share) => {
      let teamName: string | undefined;
      if (share.scope.scopeType === ShareScopeType.TEAM && teamNamesMap) {
        const teamScope = share.scope as TeamShareScope;
        teamName = teamNamesMap.get(teamScope.teamId);
      }
      return this.toDto(share, teamName);
    });
  }
}
