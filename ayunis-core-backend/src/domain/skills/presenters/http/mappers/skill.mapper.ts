import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';

import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from 'src/domain/skills/presenters/http/dto/skill-response.dto';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SkillUserContext } from 'src/domain/skills/application/services/skill-access.service';

@Injectable()
export class SkillDtoMapper {
  toDto(
    skill: PersonalSkill,
    context: SkillUserContext,
    creatorName?: string | null,
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
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      creatorName: context.isShared ? (creatorName ?? null) : null,
    };
  }

  toDtoArray(
    skills: PersonalSkill[],
    activeSkillIds: Set<string>,
    sharedSkillIds: Set<string> = new Set(),
    pinnedSkillIds: Set<string> = new Set(),
    creatorNamesByUserId: Map<UUID, string> = new Map(),
  ): SkillResponseDto[] {
    return skills.map((skill) => {
      const isShared = sharedSkillIds.has(skill.id);
      return this.toDto(
        skill,
        {
          isActive: activeSkillIds.has(skill.id),
          isShared,
          isPinned: pinnedSkillIds.has(skill.id),
        },
        isShared ? creatorNamesByUserId.get(skill.userId) : null,
      );
    });
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
