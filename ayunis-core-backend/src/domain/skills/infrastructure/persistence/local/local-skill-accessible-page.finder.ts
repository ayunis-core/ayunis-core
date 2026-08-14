import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import type { UUID } from 'crypto';
import type { SkillListOptions } from 'src/domain/skills/application/ports/skill.repository';
import { SkillRecord } from './schema/skill.record';

@Injectable()
export class LocalSkillAccessiblePageFinder {
  constructor(
    @InjectRepository(SkillRecord)
    private readonly skillRepository: Repository<SkillRecord>,
  ) {}

  buildQuery(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): SelectQueryBuilder<SkillRecord> {
    const queryBuilder = this.skillRepository.createQueryBuilder('skill').where(
      new Brackets((accessQuery) => {
        accessQuery.where('skill.userId = :userId', { userId });
        if (sharedSkillIds.length > 0) {
          accessQuery.orWhere('skill.id IN (:...sharedSkillIds)', {
            sharedSkillIds,
          });
        }
      }),
    );

    if (workspaceId) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1
          FROM workspace_skill_assignments assignment
          WHERE assignment."workspaceId" = :workspaceId
            AND assignment."skillId" = skill.id
        )`,
        { workspaceId },
      );
    }

    if (options.search) {
      queryBuilder.andWhere('skill.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    return queryBuilder;
  }
}
