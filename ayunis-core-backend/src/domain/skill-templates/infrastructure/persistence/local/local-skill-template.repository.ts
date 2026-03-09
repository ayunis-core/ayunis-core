import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { SkillTemplateRepository } from '../../../application/ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { SkillTemplateRecord } from './schema/skill-template.record';
import { AlwaysOnSkillTemplateRecord } from './schema/always-on-skill-template.record';
import { PreCreatedCopySkillTemplateRecord } from './schema/pre-created-copy-skill-template.record';
import { SkillTemplateMapper } from './mappers/skill-template.mapper';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import {
  DuplicateSkillTemplateNameError,
  SkillTemplateNotFoundError,
} from '../../../application/skill-templates.errors';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class LocalSkillTemplateRepository implements SkillTemplateRepository {
  private readonly logger = new Logger(LocalSkillTemplateRepository.name);
  private readonly childRepos: Record<
    DistributionMode,
    Repository<SkillTemplateRecord>
  >;

  constructor(
    @InjectRepository(SkillTemplateRecord)
    private readonly repository: Repository<SkillTemplateRecord>,
    @InjectRepository(AlwaysOnSkillTemplateRecord)
    alwaysOnRepository: Repository<AlwaysOnSkillTemplateRecord>,
    @InjectRepository(PreCreatedCopySkillTemplateRecord)
    preCreatedCopyRepository: Repository<PreCreatedCopySkillTemplateRecord>,
    private readonly mapper: SkillTemplateMapper,
  ) {
    this.childRepos = {
      [DistributionMode.ALWAYS_ON]: alwaysOnRepository,
      [DistributionMode.PRE_CREATED_COPY]: preCreatedCopyRepository,
    };
  }

  async create(skillTemplate: SkillTemplate): Promise<SkillTemplate> {
    this.logger.log('create', { name: skillTemplate.name });
    const record = this.mapper.toRecord(skillTemplate);
    const saved = await this.saveOrThrow(record, skillTemplate.name);
    return this.mapper.toDomain(saved);
  }

  async update(skillTemplate: SkillTemplate): Promise<SkillTemplate> {
    this.logger.log('update', {
      id: skillTemplate.id,
      name: skillTemplate.name,
    });
    const exists = await this.repository.findOne({
      where: { id: skillTemplate.id },
    });
    if (!exists) {
      throw new SkillTemplateNotFoundError(skillTemplate.id);
    }
    const record = this.mapper.toRecord(skillTemplate);
    const saved = await this.saveOrThrow(record, skillTemplate.name);
    return this.mapper.toDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new SkillTemplateNotFoundError(id);
    }
  }

  async findOne(id: UUID): Promise<SkillTemplate | null> {
    this.logger.log('findOne', { id });
    const record = await this.repository.findOne({ where: { id } });
    if (!record) return null;
    return this.mapper.toDomain(record);
  }

  async findAll(): Promise<SkillTemplate[]> {
    this.logger.log('findAll');
    const records = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async findByName(name: string): Promise<SkillTemplate | null> {
    this.logger.log('findByName', { name });
    const record = await this.repository.findOne({ where: { name } });
    if (!record) return null;
    return this.mapper.toDomain(record);
  }

  async findActiveByMode<T extends SkillTemplate = SkillTemplate>(
    mode: DistributionMode,
  ): Promise<T[]> {
    this.logger.log('findActiveByMode', { mode });
    const childRepo = this.childRepos[mode];
    const records = await childRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
    return records.map((r) => this.mapper.toDomain(r) as T);
  }

  private async saveOrThrow(
    record: SkillTemplateRecord,
    name: string,
  ): Promise<SkillTemplateRecord> {
    try {
      return await this.repository.save(record);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code ===
          PG_UNIQUE_VIOLATION
      ) {
        throw new DuplicateSkillTemplateNameError(name);
      }
      throw error;
    }
  }
}
