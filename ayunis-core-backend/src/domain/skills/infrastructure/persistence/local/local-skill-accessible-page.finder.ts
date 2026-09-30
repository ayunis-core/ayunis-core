import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
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
    private readonly defaultSkillRepository: Repository<SkillRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get skillRepository(): Repository<SkillRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(SkillRecord) ?? this.defaultSkillRepository;
  }

  buildQuery(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): SelectQueryBuilder<SkillRecord> {
    const queryBuilder = this.skillRepository.createQueryBuilder('skill');

    if (workspaceId) {
      queryBuilder.where('skill.workspaceId = :workspaceId', { workspaceId });
    } else {
      queryBuilder
        .where(
          new Brackets((accessQuery) => {
            accessQuery.where('skill.userId = :userId', { userId });
            if (sharedSkillIds.length > 0) {
              accessQuery.orWhere('skill.id IN (:...sharedSkillIds)', {
                sharedSkillIds,
              });
            }
          }),
        )
        .andWhere('skill.workspaceId IS NULL');
    }

    if (options.search) {
      queryBuilder.andWhere('skill.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    // Selected aliases keep TypeORM's joined pagination from interpreting SQL
    // expressions as entity property paths.
    return queryBuilder.addSelect('LOWER(skill.name)', 'skill_name_sort');
  }
}
