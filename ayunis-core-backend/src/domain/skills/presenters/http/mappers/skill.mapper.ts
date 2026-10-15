import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type {
  SkillContext,
  SkillUserContext,
} from 'src/domain/skills/application/models/skill-context';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { Source } from 'src/domain/sources/domain/source.entity';
import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from 'src/domain/skills/presenters/http/dto/skill-response.dto';

@Injectable()
export class SkillDtoMapper {
  toDto(
    skill: Skill,
    context: SkillUserContext &
      Partial<Pick<SkillContext, 'viewer' | 'ownerDescription'>>,
    creatorName?: string | null,
  ): SkillResponseDto {
    return {
      id: skill.id,
      ...this.ownerFields(skill),
      ...(context.viewer && {
        viewer: { ...context.viewer, canDelete: context.viewer.canEdit },
      }),
      ...(context.ownerDescription && {
        ownerDescription: context.ownerDescription,
      }),
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
      marketplaceIdentifier: skill.marketplaceIdentifier,
      isActive: context.isActive,
      isShared: context.isShared,
      isPinned: context.isPinned,
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

  private ownerFields(
    skill: Skill,
  ): Pick<SkillResponseDto, 'ownerType' | 'userId' | 'workspaceId' | 'teamId'> {
    if (skill instanceof PersonalSkill) {
      return { ownerType: 'personal', userId: skill.userId };
    }
    if (skill instanceof WorkspaceSkill) {
      return { ownerType: 'workspace', workspaceId: skill.workspaceId };
    }
    if (skill instanceof TeamSkill) {
      return { ownerType: 'team', teamId: skill.teamId };
    }
    return { ownerType: 'org' };
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
