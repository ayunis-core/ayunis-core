import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  DocumentNotInKnowledgeBaseError,
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { SetSourceReindexScheduleCommand } from 'src/domain/sources/application/use-cases/set-source-reindex-schedule/set-source-reindex-schedule.command';
import { SetSourceReindexScheduleUseCase } from 'src/domain/sources/application/use-cases/set-source-reindex-schedule/set-source-reindex-schedule.use-case';
import type { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SetDocumentReindexScheduleCommand } from './set-document-reindex-schedule.command';

@Injectable()
export class SetDocumentReindexScheduleUseCase {
  private readonly logger = new Logger(SetDocumentReindexScheduleUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly setSourceReindexSchedule: SetSourceReindexScheduleUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: SetDocumentReindexScheduleCommand,
  ): Promise<UrlSource> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        documentId: command.documentId,
        interval: command.reindexInterval && { ...command.reindexInterval },
      },
      'Setting document re-index schedule',
    );
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(knowledgeBase);

    const document = await this.repository.findSourceByIdAndKnowledgeBaseId(
      command.documentId,
      knowledgeBase.id,
    );
    if (!document) {
      throw new DocumentNotInKnowledgeBaseError(
        command.documentId,
        knowledgeBase.id,
      );
    }
    return this.setSourceReindexSchedule.execute(
      new SetSourceReindexScheduleCommand({
        sourceId: document.id,
        interval: command.reindexInterval,
      }),
    );
  }
}
