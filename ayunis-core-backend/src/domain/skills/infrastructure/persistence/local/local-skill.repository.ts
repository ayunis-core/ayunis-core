import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { randomUUID, UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

import { SkillRepository } from '../../../application/ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { SkillRecord } from './schema/skill.record';
import { SkillActivationRecord } from './schema/skill-activation.record';
import { SkillMapper } from './mappers/skill.mapper';
import {
  SkillNotActiveError,
  SkillNotFoundError,
} from '../../../application/skills.errors';

const SKILL_RELATIONS = [
  'sources',
  'mcpIntegrations',
  'knowledgeBases',
] as const;

@Injectable()
export class LocalSkillRepository implements SkillRepository {
  constructor(
    @InjectPinoLogger(LocalSkillRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(SkillRecord)
    private readonly skillRepository: Repository<SkillRecord>,
    @InjectRepository(SkillActivationRecord)
    private readonly activationRepository: Repository<SkillActivationRecord>,
    private readonly skillMapper: SkillMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private getManager(): EntityManager {
    // txHost.tx is typed non-nullable but is undefined outside an active transaction
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.skillRepository.manager;
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
    this.logger.info({ name: skill.name, userId: skill.userId }, 'create');

    const record = this.skillMapper.toRecord(skill);
    const saved = await this.skillRepository.save(record);

    // Set source relations using relation IDs
    if (skill.sourceIds.length > 0) {
      await this.skillRepository
        .createQueryBuilder()
        .relation(SkillRecord, 'sources')
        .of(saved.id)
        .add(skill.sourceIds);
    }

    // Set MCP integration relations using relation IDs
    if (skill.mcpIntegrationIds.length > 0) {
      await this.skillRepository
        .createQueryBuilder()
        .relation(SkillRecord, 'mcpIntegrations')
        .of(saved.id)
        .add(skill.mcpIntegrationIds);
    }

    // Set knowledge base relations using relation IDs
    if (skill.knowledgeBaseIds.length > 0) {
      await this.skillRepository
        .createQueryBuilder()
        .relation(SkillRecord, 'knowledgeBases')
        .of(saved.id)
        .add(skill.knowledgeBaseIds);
    }

    const withRelations = await this.skillRepository.findOne({
      where: { id: saved.id },
      relations: [...SKILL_RELATIONS],
    });

    if (!withRelations) {
      throw new Error('Failed to load created skill');
    }

    return this.skillMapper.toDomain(withRelations);
  }

  async update(skill: Skill): Promise<Skill> {
    this.logger.info({ id: skill.id, name: skill.name }, 'update');

    const manager = this.getManager();

    const existing = await manager.findOne(SkillRecord, {
      where: { id: skill.id, userId: skill.userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!existing) {
      throw new SkillNotFoundError(skill.id);
    }

    const record = this.skillMapper.toRecord(skill);
    await manager.save(SkillRecord, record);

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

    // Reload with all relations
    const reloaded = await manager.findOne(SkillRecord, {
      where: { id: skill.id },
      relations: [...SKILL_RELATIONS],
    });

    if (!reloaded) {
      throw new SkillNotFoundError(skill.id);
    }

    return this.skillMapper.toDomain(reloaded);
  }

  async delete(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.info({ skillId, userId }, 'delete');

    const result = await this.skillRepository.delete({ id: skillId, userId });
    if (result.affected === 0) {
      throw new SkillNotFoundError(skillId);
    }
  }

  async findOne(id: UUID, userId: UUID): Promise<Skill | null> {
    this.logger.info({ id, userId }, 'findOne');

    const record = await this.skillRepository.findOne({
      where: { id, userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async findAllByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.info({ userId }, 'findAllByOwner');

    const records = await this.skillRepository.find({
      where: { userId },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findActiveByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.info({ userId }, 'findActiveByOwner');

    const activations = await this.activationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    if (activations.length === 0) return [];

    const activeSkillIds = activations.map((a) => a.skillId);
    const records = await this.skillRepository.find({
      where: { id: In(activeSkillIds), userId },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findByNameAndOwner(name: string, userId: UUID): Promise<Skill | null> {
    this.logger.info({ name, userId }, 'findByNameAndOwner');

    const record = await this.skillRepository.findOne({
      where: { name, userId },
      relations: [...SKILL_RELATIONS],
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async activateSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.info({ skillId, userId }, 'activateSkill');

    const manager = this.getManager();

    // Use upsert to atomically insert or ignore if already exists.
    // This avoids race conditions where concurrent requests both pass
    // an existence check and then one fails on the unique constraint.
    await manager
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
    this.logger.info({ skillId, userId }, 'deactivateSkill');

    const manager = this.getManager();
    await manager.delete(SkillActivationRecord, { skillId, userId });
  }

  async deactivateAllExceptOwner(skillId: UUID, ownerId: UUID): Promise<void> {
    this.logger.info({ skillId, ownerId }, 'deactivateAllExceptOwner');

    const manager = this.getManager();
    await manager
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
    this.logger.info(
      {
        skillId,
        ownerId,
        retainCount: retainUserIds.size,
      },
      'deactivateUsersNotInSet',
    );

    const manager = this.getManager();
    const keepIds = [ownerId, ...retainUserIds];

    await manager
      .createQueryBuilder()
      .delete()
      .from(SkillActivationRecord)
      .where('skillId = :skillId', { skillId })
      .andWhere('userId NOT IN (:...keepIds)', { keepIds })
      .execute();
  }

  async isSkillActive(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ skillId, userId }, 'isSkillActive');

    const count = await this.activationRepository.count({
      where: { skillId, userId },
    });

    return count > 0;
  }

  async findByIds(ids: UUID[]): Promise<Skill[]> {
    this.logger.info({ count: ids.length }, 'findByIds');

    if (ids.length === 0) return [];

    const records = await this.skillRepository.find({
      where: { id: In(ids) },
      relations: [...SKILL_RELATIONS],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async getActiveSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.info({ userId }, 'getActiveSkillIds');

    const activations = await this.activationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }

  async pinSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.info({ skillId, userId }, 'pinSkill');

    const manager = this.getManager();
    const result = await manager
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
    this.logger.info({ skillId, userId }, 'toggleSkillPinned');

    const manager = this.getManager();

    const rows: Array<{ isPinned: boolean }> = await manager.query(
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
    this.logger.info({ skillId, userId }, 'isSkillPinned');

    const manager = this.getManager();
    const count = await manager.count(SkillActivationRecord, {
      where: { skillId, userId, isPinned: true },
    });

    return count > 0;
  }

  async getPinnedSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.info({ userId }, 'getPinnedSkillIds');

    const manager = this.getManager();
    const activations = await manager.find(SkillActivationRecord, {
      where: { userId, isPinned: true },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }

  async findSkillsByKnowledgeBaseAndOwners(
    knowledgeBaseId: UUID,
    ownerIds: UUID[],
  ): Promise<Skill[]> {
    this.logger.info(
      {
        knowledgeBaseId,
        ownerCount: ownerIds.length,
      },
      'findSkillsByKnowledgeBaseAndOwners',
    );

    if (ownerIds.length === 0) return [];

    const manager = this.getManager();
    const records = await manager
      .createQueryBuilder(SkillRecord, 'skill')
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

  async removeKnowledgeBaseFromSkills(
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void> {
    this.logger.info(
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
