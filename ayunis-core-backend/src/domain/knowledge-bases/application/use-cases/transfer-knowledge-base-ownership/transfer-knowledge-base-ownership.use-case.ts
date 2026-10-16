import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseOwnerChangedError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TransferKnowledgeBaseOwnershipCommand } from './transfer-knowledge-base-ownership.command';

@Injectable()
export class TransferKnowledgeBaseOwnershipUseCase {
  private readonly logger = new Logger(
    TransferKnowledgeBaseOwnershipUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: TransferKnowledgeBaseOwnershipCommand): Promise<void> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId, target: command.target.type },
      'Transferring knowledge base ownership',
    );
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    if (
      !(knowledgeBase instanceof PersonalKnowledgeBase) ||
      knowledgeBase.userId !== command.requesterId
    ) {
      throw new KnowledgeBaseOwnerChangedError(command.knowledgeBaseId);
    }
    const wasActive = await this.repository.isActive(
      knowledgeBase.id,
      command.requesterId,
    );
    const moved = await this.collectiveRepository.transferFromPersonal(
      knowledgeBase.id,
      {
        teamId: command.target.type === 'team' ? command.target.teamId : null,
        submittedByUserId: command.requesterId,
      },
    );
    if (!moved) {
      throw new KnowledgeBaseOwnerChangedError(command.knowledgeBaseId);
    }
    if (!wasActive) {
      await this.collectiveRepository.setActive(
        knowledgeBase.id,
        command.requesterId,
        false,
      );
    }
  }
}
