import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

import { SkillRepository } from '../../../application/ports/skill.repository';
import { Skill } from '../../../domain/skill.entity';
import { SkillRecord } from './schema/skill.record';
import { SkillMapper } from './mappers/skill.mapper';
import { SkillNotFoundError } from '../../../application/skills.errors';

@Injectable()
export class LocalSkillRepository implements SkillRepository {
  private readonly logger = new Logger(LocalSkillRepository.name);

  constructor(
    @InjectRepository(SkillRecord)
    private readonly skillRepository: Repository<SkillRecord>,
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

    const records = await this.skillRepository.find({
      where: { userId, isActive: true },
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
}
