import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { randomUUID, UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

import {
  SkillRepository,
  type SkillListOptions,
} from 'src/domain/skills/application/ports/skill.repository';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import { LocalSkillAccessiblePageFinder } from './local-skill-accessible-page.finder';
import { LocalSkillKnowledgeBaseIdsFinder } from './local-skill-knowledge-base-ids.finder';
import { Paginated } from 'src/common/pagination/paginated.entity';
import {
  SkillNotActiveError,
  SkillNotFoundError,
} from 'src/domain/skills/application/skills.errors';

const SKILL_RELATIONS = [
  'sources',
  'mcpIntegrations',
  'knowledgeBases',
] as const;

@Injectable()
export class LocalSkillRepository implements SkillRepository {
  private readonly logger = new Logger(LocalSkillRepository.name);

  // eslint-disable-next-line max-params -- NestJS injects the repository's collaborators.
  constructor(
    @InjectRepository(SkillRecord)
    private readonly defaultSkillRepository: Repository<SkillRecord>,
    private readonly skillMapper: SkillMapper,
    private readonly accessiblePageFinder: LocalSkillAccessiblePageFinder,
    private readonly knowledgeBaseIdsFinder: LocalSkillKnowledgeBaseIdsFinder,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private getManager(): EntityManager {
    // Scheduled and background callers can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultSkillRepository.manager;
  }

  private get skillRepository(): Repository<SkillRecord> {
    return this.getManager().getRepository(SkillRecord);
  }

  private get skillActivationRepository(): Repository<SkillActivationRecord> {
    return this.getManager().getRepository(SkillActivationRecord);
  }

  private async syncRelation(
    manager: EntityManager,
    skillId: UUID,
    relation: 'sources' | 'mcpIntegrations' | 'knowledgeBases',
    existingIds: UUID[],
    desiredIds: UUID[],
  ): Promise<void> {
    const toAdd = desiredIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !desiredIds.includes(id));

    if (toAdd.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, relation)
        .of(skillId)
        .add(toAdd);
    }

    if (toRemove.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, relation)
        .of(skillId)
        .remove(toRemove);
    }
  }

  async create(skill: Skill): Promise<Skill> {
    this.logger.log({ name: skill.name, userId: skill.userId }, 'create');

    const repository = this.skillRepository;
    const record = this.skillMapper.toRecord(skill);
    const saved = await repository.save(record);

    if (skill.sourceIds.length > 0) {
      await repository
        .createQueryBuilder()
        .relation(SkillRecord, 'sources')
        .of(saved.id)
        .add(skill.sourceIds);
    }

    if (skill.mcpIntegrationIds.length > 0) {
      await repository
        .createQueryBuilder()
        .relation(SkillRecord, 'mcpIntegrations')
        .of(saved.id)
        .add(skill.mcpIntegrationIds);
    }

    if (skill.knowledgeBaseIds.length > 0) {
      await repository
        .createQueryBuilder()
        .relation(SkillRecord, 'knowledgeBases')
        .of(saved.id)
        .add(skill.knowledgeBaseIds);
    }

    const withRelations = await repository.findOne({
      where: { id: saved.id },
      relations: [...SKILL_RELATIONS],
    });

    if (!withRelations) {
      throw new Error('Failed to load created skill');
    }

    return this.skillMapper.toDomain(withRelations);
  }

  async update(skill: Skill): Promise<Skill> {
    this.logger.log({ id: skill.id, name: skill.name }, 'update');

    const manager = this.getManager();

    const existing = await this.skillRepository.findOne({
      where: { id: skill.id, userId: skill.userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!existing) {
      throw new SkillNotFoundError(skill.id);
    }

    const record = this.skillMapper.toRecord(skill);
    await this.skillRepository.save(record);

    await this.syncRelation(
      manager,
      skill.id,
      'sources',
      existing.sources?.map((s) => s.id) ?? [],
      skill.sourceIds,
    );
    await this.syncRelation(
      manager,
      skill.id,
      'mcpIntegrations',
      existing.mcpIntegrations?.map((i) => i.id) ?? [],
      skill.mcpIntegrationIds,
    );
    await this.syncRelation(
      manager,
      skill.id,
      'knowledgeBases',
      existing.knowledgeBases?.map((kb) => kb.id) ?? [],
      skill.knowledgeBaseIds,
    );

    const reloaded = await this.skillRepository.findOne({
      where: { id: skill.id },
      relations: [...SKILL_RELATIONS],
    });

    if (!reloaded) {
      throw new SkillNotFoundError(skill.id);
    }

    return this.skillMapper.toDomain(reloaded);
  }

  async delete(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log({ skillId, userId }, 'delete');

    const result = await this.skillRepository.delete({
      id: skillId,
      userId,
    });
    if (result.affected === 0) {
      throw new SkillNotFoundError(skillId);
    }
  }

  async findOne(id: UUID, userId: UUID): Promise<Skill | null> {
    this.logger.log({ id, userId }, 'findOne');

    const record = await this.skillRepository.findOne({
      where: { id, userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async findAllByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.log({ userId }, 'findAllByOwner');

    const records = await this.skillRepository.find({
      where: { userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedSkillIds: UUID[],
    options: SkillListOptions,
  ): Promise<Paginated<Skill>> {
    this.logger.log(
      {
        userId,
        workspaceId,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      },
      'findPaginatedAccessible',
    );

    const [records, total] = await this.accessiblePageFinder
      .buildQuery(userId, workspaceId, sharedSkillIds, options)
      .orderBy('LOWER(skill.name)', 'ASC')
      .addOrderBy('skill.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) => this.skillMapper.toDomain(record)),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }

  async findActiveByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.log({ userId }, 'findActiveByOwner');

    const activations = await this.skillActivationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    if (activations.length === 0) return [];

    const activeSkillIds = activations.map((a) => a.skillId);
    const records = await this.skillRepository.find({
      where: { id: In(activeSkillIds), userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findByNameAndOwner(name: string, userId: UUID): Promise<Skill | null> {
    this.logger.log({ name, userId }, 'findByNameAndOwner');

    const record = await this.skillRepository.findOne({
      where: { name, userId, workspaceId: IsNull() },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async activateSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log({ skillId, userId }, 'activateSkill');

    // Use upsert to atomically insert or ignore if already exists.
    // This avoids race conditions where concurrent requests both pass
    // an existence check and then one fails on the unique constraint.
    await this.skillActivationRepository
      .createQueryBuilder()
      .insert()
      .into(SkillActivationRecord)
      .values({
        id: randomUUID(),
        skillId,
        userId,
      })
      .orIgnore()
      .execute();
  }

  async deactivateSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log({ skillId, userId }, 'deactivateSkill');

    await this.skillActivationRepository.delete({ skillId, userId });
  }

  async deactivateAllExceptOwner(skillId: UUID, ownerId: UUID): Promise<void> {
    this.logger.log({ skillId, ownerId }, 'deactivateAllExceptOwner');

    await this.skillActivationRepository
      .createQueryBuilder()
      .delete()
      .from(SkillActivationRecord)
      .where('skillId = :skillId', { skillId })
      .andWhere('userId != :ownerId', { ownerId })
      .execute();
  }

  async deactivateUsersNotInSet(
    skillId: UUID,
    ownerId: UUID,
    retainUserIds: Set<UUID>,
  ): Promise<void> {
    this.logger.log(
      {
        skillId,
        ownerId,
        retainCount: retainUserIds.size,
      },
      'deactivateUsersNotInSet',
    );

    const keepIds = [ownerId, ...retainUserIds];

    await this.skillActivationRepository
      .createQueryBuilder()
      .delete()
      .from(SkillActivationRecord)
      .where('skillId = :skillId', { skillId })
      .andWhere('userId NOT IN (:...keepIds)', { keepIds })
      .execute();
  }

  async isSkillActive(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log({ skillId, userId }, 'isSkillActive');

    const count = await this.skillActivationRepository.count({
      where: { skillId, userId },
    });

    return count > 0;
  }

  async findByIds(ids: UUID[]): Promise<Skill[]> {
    this.logger.log({ count: ids.length }, 'findByIds');

    if (ids.length === 0) return [];

    const records = await this.skillRepository.find({
      where: { id: In(ids) },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async getActiveSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.log({ userId }, 'getActiveSkillIds');

    const activations = await this.skillActivationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }

  async pinSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log({ skillId, userId }, 'pinSkill');

    const result = await this.skillActivationRepository
      .createQueryBuilder()
      .update(SkillActivationRecord)
      .set({ isPinned: true })
      .where('"skillId" = :skillId AND "userId" = :userId', {
        skillId,
        userId,
      })
      .execute();

    if (result.affected === 0) {
      throw new SkillNotActiveError(skillId);
    }
  }

  async toggleSkillPinned(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log({ skillId, userId }, 'toggleSkillPinned');

    const rows: Array<{ isPinned: boolean }> =
      await this.skillActivationRepository.query(
        `UPDATE skill_activations SET "isPinned" = NOT "isPinned"
       WHERE "skillId" = $1 AND "userId" = $2
       RETURNING "isPinned"`,
        [skillId, userId],
      );

    if (rows.length === 0) {
      throw new SkillNotActiveError(skillId);
    }

    return rows[0].isPinned;
  }

  async isSkillPinned(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log({ skillId, userId }, 'isSkillPinned');

    const count = await this.skillActivationRepository.count({
      where: { skillId, userId, isPinned: true },
    });

    return count > 0;
  }

  async getPinnedSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.log({ userId }, 'getPinnedSkillIds');

    const activations = await this.skillActivationRepository.find({
      where: { userId, isPinned: true },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }

  async findSkillsByKnowledgeBaseAndOwners(
    knowledgeBaseId: UUID,
    ownerIds: UUID[],
  ): Promise<Skill[]> {
    this.logger.log(
      {
        knowledgeBaseId,
        ownerCount: ownerIds.length,
      },
      'findSkillsByKnowledgeBaseAndOwners',
    );

    if (ownerIds.length === 0) return [];

    const records = await this.skillRepository
      .createQueryBuilder('skill')
      .innerJoin(
        'skill_knowledge_bases',
        'skb',
        'skb."skillsId" = skill.id AND skb."knowledgeBasesId" = :kbId',
        { kbId: knowledgeBaseId },
      )
      .leftJoinAndSelect('skill.sources', 'sources')
      .leftJoinAndSelect('skill.mcpIntegrations', 'mcpIntegrations')
      .leftJoinAndSelect('skill.knowledgeBases', 'knowledgeBases')
      .where('skill.userId IN (:...ownerIds)', { ownerIds })
      .getMany();

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findKnowledgeBaseIdsBySkillIds(skillIds: UUID[]): Promise<UUID[]> {
    this.logger.log(
      { skillCount: skillIds.length },
      'findKnowledgeBaseIdsBySkillIds',
    );
    return this.knowledgeBaseIdsFinder.findKnowledgeBaseIdsBySkillIds(
      skillIds,
      this.getManager(),
    );
  }

  async removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void> {
    this.logger.log(
      {
        knowledgeBaseId,
        skillCount: skillIds.length,
      },
      'removeKnowledgeBaseFromSkills',
    );

    if (skillIds.length === 0) return;

    const manager = this.getManager();
    await manager
      .createQueryBuilder()
      .delete()
      .from('skill_knowledge_bases')
      .where('"knowledgeBasesId" = :kbId', { kbId: knowledgeBaseId })
      .andWhere('"skillsId" IN (:...skillIds)', { skillIds })
      .execute();
  }
}
