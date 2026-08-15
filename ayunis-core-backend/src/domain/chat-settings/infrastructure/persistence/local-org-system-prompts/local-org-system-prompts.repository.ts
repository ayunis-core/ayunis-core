import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { OrgSystemPromptsRepository } from 'src/domain/chat-settings/application/ports/org-system-prompts.repository';
import { OrgSystemPrompt } from 'src/domain/chat-settings/domain/org-system-prompt.entity';
import { OrgSystemPromptRecord } from './schema/org-system-prompt.record';
import { OrgSystemPromptMapper } from './mappers/org-system-prompt.mapper';

@Injectable()
export class LocalOrgSystemPromptsRepository extends OrgSystemPromptsRepository {
  constructor(
    @InjectPinoLogger(LocalOrgSystemPromptsRepository.name)
    private readonly logger: PinoLogger,
    @InjectRepository(OrgSystemPromptRecord)
    private readonly repository: Repository<OrgSystemPromptRecord>,
    private readonly mapper: OrgSystemPromptMapper,
  ) {
    super();
  }

  async findByOrgId(orgId: UUID): Promise<OrgSystemPrompt | null> {
    this.logger.info({ orgId }, 'findByOrgId');

    const record = await this.repository.findOne({ where: { orgId } });

    if (!record) {
      this.logger.debug({ orgId }, 'No org system prompt found');
      return null;
    }

    return this.mapper.toDomain(record);
  }

  async upsert(orgSystemPrompt: OrgSystemPrompt): Promise<OrgSystemPrompt> {
    this.logger.info({ orgId: orgSystemPrompt.orgId }, 'upsert');

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

    this.logger.debug(
      {
        orgId: orgSystemPrompt.orgId,
        id: savedRecord.id,
      },
      'Org system prompt upserted',
    );

    return this.mapper.toDomain(savedRecord);
  }

  async deleteByOrgId(orgId: UUID): Promise<void> {
    this.logger.info({ orgId }, 'deleteByOrgId');

    await this.repository.delete({ orgId });

    this.logger.debug({ orgId }, 'Org system prompt deleted');
  }
}
