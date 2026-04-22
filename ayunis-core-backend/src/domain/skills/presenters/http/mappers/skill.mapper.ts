import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillResponseDto,
  SkillSourceResponseDto,
} from '../dto/skill-response.dto';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SkillUserContext } from '../../../application/services/skill-access.service';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';

@Injectable()
export class SkillDtoMapper {
  constructor(
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
  ) {}

  async toDto(
    skill: Skill,
    context: SkillUserContext,
  ): Promise<SkillResponseDto> {
    const creatorName = context.isShared
      ? await this.resolveCreatorName(skill.userId)
      : null;
    return this.buildDto(skill, context, creatorName);
  }

  async toDtoArray(
    skills: Skill[],
    activeSkillIds: Set<string>,
    sharedSkillIds: Set<string> = new Set(),
    pinnedSkillIds: Set<string> = new Set(),
  ): Promise<SkillResponseDto[]> {
    const sharedSkillUserIds = skills
      .filter((skill) => sharedSkillIds.has(skill.id))
      .map((skill) => skill.userId);
    const creatorNamesByUserId =
      await this.resolveCreatorNames(sharedSkillUserIds);

    return skills.map((skill) => {
      const isShared = sharedSkillIds.has(skill.id);
      return this.buildDto(
        skill,
        {
          isActive: activeSkillIds.has(skill.id),
          isShared,
          isPinned: pinnedSkillIds.has(skill.id),
        },
        isShared ? (creatorNamesByUserId.get(skill.userId) ?? null) : null,
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

  private buildDto(
    skill: Skill,
    context: SkillUserContext,
    creatorName: string | null,
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

  private async resolveCreatorName(userId: UUID): Promise<string | null> {
    try {
      const user = await this.findUserByIdUseCase.execute(
        new FindUserByIdQuery(userId),
      );
      return user.name;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  private async resolveCreatorNames(
    userIds: UUID[],
  ): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) {
      return new Map();
    }
    const users = await this.findUsersByIdsUseCase.execute(
      new FindUsersByIdsQuery(uniqueIds),
    );
    return new Map(users.map((u) => [u.id, u.name]));
  }
}
