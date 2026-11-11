import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import type { UUID } from 'crypto';
import type { SkillListOptions } from 'src/domain/skills/application/ports/skill.repository';
import type { ReadableSkillOwners } from 'src/domain/skills/application/models/skill-owner';
import { SkillRecord } from './schema/skill.record';
import type { SkillMapper } from './mappers/skill.mapper';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { whereCollectiveOwner } from './local-collective-skill.finder';

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
    options: SkillListOptions,
    collectiveOwners?: ReadableSkillOwners,
  ): SelectQueryBuilder<SkillRecord> {
    const queryBuilder = this.skillRepository.createQueryBuilder('skill');

    if (workspaceId) {
      queryBuilder.where('skill.workspaceId = :workspaceId', { workspaceId });
    } else {
      queryBuilder
        .where(
          new Brackets((accessQuery) => {
            accessQuery.where('skill.userId = :userId', { userId });
            if (collectiveOwners) {
              accessQuery.orWhere(
                new Brackets((owner) =>
                  whereCollectiveOwner(owner, collectiveOwners),
                ),
              );
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

  async findPage(
    scope: {
      userId: UUID;
      workspaceId: UUID | undefined;
      collectiveOwners?: ReadableSkillOwners;
    },
    options: SkillListOptions,
    mapper: SkillMapper,
  ): Promise<Paginated<Skill>> {
    const { workspaceId } = scope;
    const [records, total] = await this.buildQuery(
      scope.userId,
      workspaceId,
      options,
      workspaceId === undefined ? scope.collectiveOwners : undefined,
    )
      .addOrderBy('skill_name_sort', 'ASC')
      .addOrderBy('skill.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) =>
        workspaceId === undefined
          ? mapper.toDomain(record)
          : mapper.toWorkspace(record),
      ),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }
}
