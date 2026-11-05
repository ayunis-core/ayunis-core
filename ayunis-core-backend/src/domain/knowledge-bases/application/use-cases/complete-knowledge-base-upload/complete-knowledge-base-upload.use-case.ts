import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { Source } from 'src/domain/sources/domain/source.entity';
import { CompleteSourceUploadUseCase } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.use-case';
import { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { CompleteKnowledgeBaseUploadCommand } from './complete-knowledge-base-upload.command';

/**
 * Finishes a direct upload for a knowledge base. Tables take the document
 * pipeline here (one searchable text source), so an upload always yields a
 * single source; it is assigned once, however often completion is called.
 */
@Injectable()
export class CompleteKnowledgeBaseUploadUseCase {
  private readonly logger = new Logger(CompleteKnowledgeBaseUploadUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseWriteAccessService,
    private readonly completeUpload: CompleteSourceUploadUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: CompleteKnowledgeBaseUploadCommand): Promise<Source> {
    const { knowledgeBaseId, uploadId } = command;
    this.logger.log(
      { knowledgeBaseId, uploadId },
      'completeKnowledgeBaseUpload',
    );
    const knowledgeBase = await this.repository.findById(knowledgeBaseId);
    if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    await this.access.requireWrite(knowledgeBase);
    const count =
      await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);

    const { sources } = await this.completeUpload.execute(
      new CompleteSourceUploadCommand({
        uploadId,
        targetType: SourceUploadTargetType.KNOWLEDGE_BASE,
        targetId: knowledgeBaseId,
        attach: async (sources) => {
          for (const source of sources) {
            await this.repository.assignSourceToKnowledgeBase(
              source.id,
              knowledgeBaseId,
            );
            source.knowledgeBaseId = knowledgeBaseId;
          }
        },
        ensureCapacityFor: (sourceCount) => {
          if (count + sourceCount > KnowledgeBasesConstants.MAX_SOURCES) {
            throw new KnowledgeBaseSourceLimitExceededError(
              KnowledgeBasesConstants.MAX_SOURCES,
            );
          }
        },
      }),
    );
    return sources[0];
  }
}
