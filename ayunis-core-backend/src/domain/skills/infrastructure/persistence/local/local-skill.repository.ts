import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class LocalSkillRepository implements SkillRepository {
  private readonly logger = new Logger(LocalSkillRepository.name);

  constructor(
    @InjectRepository(SkillRecord)
    private readonly skillRepository: Repository<SkillRecord>,
    @InjectRepository(SkillActivationRecord)
    private readonly activationRepository: Repository<SkillActivationRecord>,
    private readonly skillMapper: SkillMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private getManager(): EntityManager {
    return this.txHost.tx ?? this.skillRepository.manager;
  }

  async create(skill: Skill): Promise<Skill> {
    this.logger.log('create', { name: skill.name, userId: skill.userId });

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

    const withRelations = await this.skillRepository.findOne({
      where: { id: saved.id },
      relations: ['sources', 'mcpIntegrations'],
    });

    if (!withRelations) {
      throw new Error('Failed to load created skill');
    }

    return this.skillMapper.toDomain(withRelations);
  }

  async update(skill: Skill): Promise<Skill> {
    this.logger.log('update', { id: skill.id, name: skill.name });

    const manager = this.getManager();

    const existing = await manager.findOne(SkillRecord, {
      where: { id: skill.id, userId: skill.userId },
      relations: { sources: true, mcpIntegrations: true },
    });

    if (!existing) {
      throw new SkillNotFoundError(skill.id);
    }

    // Save updated record
    const record = this.skillMapper.toRecord(skill);
    await manager.save(SkillRecord, record);

    // Handle sources many-to-many
    const existingSourceIds = existing.sources?.map((s) => s.id) ?? [];
    const sourcesToAdd = skill.sourceIds.filter(
      (id) => !existingSourceIds.includes(id),
    );
    const sourcesToRemove = existingSourceIds.filter(
      (id) => !skill.sourceIds.includes(id),
    );

    if (sourcesToAdd.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, 'sources')
        .of(skill.id)
        .add(sourcesToAdd);
    }

    if (sourcesToRemove.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, 'sources')
        .of(skill.id)
        .remove(sourcesToRemove);
    }

    // Handle MCP integrations many-to-many
    const existingMcpIds = existing.mcpIntegrations?.map((i) => i.id) ?? [];
    const mcpToAdd = skill.mcpIntegrationIds.filter(
      (id) => !existingMcpIds.includes(id),
    );
    const mcpToRemove = existingMcpIds.filter(
      (id) => !skill.mcpIntegrationIds.includes(id),
    );

    if (mcpToAdd.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, 'mcpIntegrations')
        .of(skill.id)
        .add(mcpToAdd);
    }

    if (mcpToRemove.length > 0) {
      await manager
        .createQueryBuilder()
        .relation(SkillRecord, 'mcpIntegrations')
        .of(skill.id)
        .remove(mcpToRemove);
    }

    // Reload with all relations
    const reloaded = await manager.findOne(SkillRecord, {
      where: { id: skill.id },
      relations: { sources: true, mcpIntegrations: true },
    });

    if (!reloaded) {
      throw new SkillNotFoundError(skill.id);
    }

    return this.skillMapper.toDomain(reloaded);
  }

  async delete(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { skillId, userId });

    const result = await this.skillRepository.delete({ id: skillId, userId });
    if (result.affected === 0) {
      throw new SkillNotFoundError(skillId);
    }
  }

  async findOne(id: UUID, userId: UUID): Promise<Skill | null> {
    this.logger.log('findOne', { id, userId });

    const record = await this.skillRepository.findOne({
      where: { id, userId },
      relations: { sources: true, mcpIntegrations: true },
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async findAllByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.log('findAllByOwner', { userId });

    const records = await this.skillRepository.find({
      where: { userId },
      relations: ['sources', 'mcpIntegrations'],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findActiveByOwner(userId: UUID): Promise<Skill[]> {
    this.logger.log('findActiveByOwner', { userId });

    const activations = await this.activationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    if (activations.length === 0) return [];

    const activeSkillIds = activations.map((a) => a.skillId);
    const records = await this.skillRepository.find({
      where: { id: In(activeSkillIds), userId },
      relations: ['sources', 'mcpIntegrations'],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async findByNameAndOwner(name: string, userId: UUID): Promise<Skill | null> {
    this.logger.log('findByNameAndOwner', { name, userId });

    const record = await this.skillRepository.findOne({
      where: { name, userId },
      relations: ['sources', 'mcpIntegrations'],
    });

    if (!record) return null;
    return this.skillMapper.toDomain(record);
  }

  async activateSkill(skillId: UUID, userId: UUID): Promise<void> {
    this.logger.log('activateSkill', { skillId, userId });

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
    this.logger.log('deactivateSkill', { skillId, userId });

    const manager = this.getManager();
    await manager.delete(SkillActivationRecord, { skillId, userId });
  }

  async deactivateAllExceptOwner(skillId: UUID, ownerId: UUID): Promise<void> {
    this.logger.log('deactivateAllExceptOwner', { skillId, ownerId });

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
    this.logger.log('deactivateUsersNotInSet', {
      skillId,
      ownerId,
      retainCount: retainUserIds.size,
    });

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
    this.logger.log('isSkillActive', { skillId, userId });

    const count = await this.activationRepository.count({
      where: { skillId, userId },
    });

    return count > 0;
  }

  async findByIds(ids: UUID[]): Promise<Skill[]> {
    this.logger.log('findByIds', { count: ids.length });

    if (ids.length === 0) return [];

    const records = await this.skillRepository.find({
      where: { id: In(ids) },
      relations: ['sources', 'mcpIntegrations'],
    });

    return records.map((r) => this.skillMapper.toDomain(r));
  }

  async getActiveSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.log('getActiveSkillIds', { userId });

    const activations = await this.activationRepository.find({
      where: { userId },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }

  async toggleSkillPinned(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.log('toggleSkillPinned', { skillId, userId });

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
    this.logger.log('isSkillPinned', { skillId, userId });

    const manager = this.getManager();
    const count = await manager.count(SkillActivationRecord, {
      where: { skillId, userId, isPinned: true },
    });

    return count > 0;
  }

  async getPinnedSkillIds(userId: UUID): Promise<Set<UUID>> {
    this.logger.log('getPinnedSkillIds', { userId });

    const manager = this.getManager();
    const activations = await manager.find(SkillActivationRecord, {
      where: { userId, isPinned: true },
      select: ['skillId'],
    });

    return new Set(activations.map((a) => a.skillId));
  }
}
