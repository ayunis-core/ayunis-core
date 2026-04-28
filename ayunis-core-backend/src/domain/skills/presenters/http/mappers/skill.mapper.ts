import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from '../dto/skill-response.dto';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SkillUserContext } from '../../../application/services/skill-access.service';

@Injectable()
export class SkillDtoMapper {
  toDto(
    skill: Skill,
    context: SkillUserContext,
    creatorName: string | null = null,
  ): SkillResponseDto {
    return {
      id: skill.id,
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
      marketplaceIdentifier: skill.marketplaceIdentifier,
      isActive: context.isActive,
      isShared: context.isShared,
      isPinned: context.isPinned,
      userId: skill.userId,
      creatorName,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }

  toDtoArray(
    skills: Skill[],
    activeSkillIds: Set<string>,
    sharedSkillIds: Set<string> = new Set(),
    pinnedSkillIds: Set<string> = new Set(),
    creatorNamesByUserId: Map<UUID, string> = new Map(),
  ): SkillResponseDto[] {
    return skills.map((skill) =>
      this.toDto(
        skill,
        {
          isActive: activeSkillIds.has(skill.id),
          isShared: sharedSkillIds.has(skill.id),
          isPinned: pinnedSkillIds.has(skill.id),
        },
        creatorNamesByUserId.get(skill.userId) ?? null,
      ),
    );
  }

  sourceToDto(source: Source): SkillSourceResponseDto {
    return {
      id: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      processingError: source.processingError ?? undefined,
      createdAt: source.createdAt.toISOString(),
    };
  }

  sourcesToDtoArray(sources: Source[]): SkillSourceResponseDto[] {
    return sources.map((source) => this.sourceToDto(source));
  }
}
