import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptRecord } from './schema/org-system-prompt.record';
import { OrgSystemPromptMapper } from './mappers/org-system-prompt.mapper';

@Injectable()
export class LocalOrgSystemPromptsRepository extends OrgSystemPromptsRepository {
  private readonly logger = new Logger(LocalOrgSystemPromptsRepository.name);

  constructor(
    @InjectRepository(OrgSystemPromptRecord)
    private readonly repository: Repository<OrgSystemPromptRecord>,
    private readonly mapper: OrgSystemPromptMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgSystemPrompt | null> {
    this.logger.log('findByOrgId', { orgId });

    const record = await this.repository.findOne({ where: { orgId } });

    if (!record) {
      this.logger.debug('No org system prompt found', { orgId });
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(orgSystemPrompt: OrgSystemPrompt): Promise<OrgSystemPrompt> {
    this.logger.log('upsert', { orgId: orgSystemPrompt.orgId });

    const record = this.mapper.toRecord(orgSystemPrompt);

    // Use atomic upsert with conflict resolution on orgId
    await this.repository.upsert(record, {
      conflictPaths: ['orgId'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Fetch the saved record to get the actual id (may be existing or new)
    const savedRecord = await this.repository.findOneOrFail({
      where: { orgId: orgSystemPrompt.orgId },
    });

    this.logger.debug('Org system prompt upserted', {
      orgId: orgSystemPrompt.orgId,
      id: savedRecord.id,
    });

    return this.mapper.toDomain(savedRecord);
  }

  async deleteByOrgId(orgId: UUID): Promise<void> {
    this.logger.log('deleteByOrgId', { orgId });

    await this.repository.delete({ orgId });

    this.logger.debug('Org system prompt deleted', { orgId });
  }
}
