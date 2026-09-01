import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { DuplicateKnowledgeBaseDocumentsCommand } from './duplicate-knowledge-base-documents.command';

@Injectable()
export class DuplicateKnowledgeBaseDocumentsUseCase {
  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: DuplicateKnowledgeBaseDocumentsCommand,
  ): Promise<void> {
    await this.knowledgeBaseRepository.duplicateDocumentsIntoKnowledgeBase(
      command.originKnowledgeBaseId,
      command.targetKnowledgeBaseId,
    );
  }
}
