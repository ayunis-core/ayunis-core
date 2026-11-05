import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import {
  type CreatedSourceUpload,
  CreateSourceUploadSessionUseCase,
} from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.use-case';
import { CreateSourceUploadSessionCommand } from 'src/domain/sources/application/use-cases/create-source-upload-session/create-source-upload-session.command';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import { CreateKnowledgeBaseUploadCommand } from './create-knowledge-base-upload.command';

@Injectable()
export class CreateKnowledgeBaseUploadUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUploadUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseWriteAccessService,
    private readonly createSession: CreateSourceUploadSessionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: CreateKnowledgeBaseUploadCommand,
  ): Promise<CreatedSourceUpload> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId, fileName: command.fileName },
      'createKnowledgeBaseUpload',
    );
    await this.requireWritableWithCapacity(command.knowledgeBaseId);
    return this.createSession.execute(
      new CreateSourceUploadSessionCommand({
        targetType: SourceUploadTargetType.KNOWLEDGE_BASE,
        targetId: command.knowledgeBaseId,
        fileName: command.fileName,
        mimeType: command.mimeType,
        fileSize: command.fileSize,
        maxFileSizeBytes: KnowledgeBasesConstants.MAX_FILE_SIZE_BYTES,
      }),
    );
  }

  // A capacity check, not a reservation: the assignment on completion is
  // the authoritative, capacity-guarded write.
  @Transactional()
  private async requireWritableWithCapacity(
    knowledgeBaseId: UUID,
  ): Promise<void> {
    const knowledgeBase = await this.repository.findById(knowledgeBaseId);
    if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
    await this.access.requireWrite(knowledgeBase);
    const count =
      await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);
    if (count >= KnowledgeBasesConstants.MAX_SOURCES) {
      throw new KnowledgeBaseSourceLimitExceededError(
        KnowledgeBasesConstants.MAX_SOURCES,
      );
    }
  }
}
