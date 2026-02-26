import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { CreateTextSourceUseCase } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.use-case';
import { CreateUrlSourceCommand } from 'src/domain/sources/application/use-cases/create-text-source/create-text-source.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';

@Injectable()
export class AddUrlToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddUrlToKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly createTextSourceUseCase: CreateTextSourceUseCase,
  ) {}

  @Transactional()
  async execute(command: AddUrlToKnowledgeBaseCommand): Promise<TextSource> {
    this.logger.log('Adding URL to knowledge base', {
      knowledgeBaseId: command.knowledgeBaseId,
      url: command.url,
    });

    try {
      const knowledgeBase = await this.knowledgeBaseRepository.findById(
        command.knowledgeBaseId,
      );
      if (knowledgeBase?.userId !== command.userId) {
        throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
      }

      const source = await this.createTextSourceUseCase.execute(
        new CreateUrlSourceCommand({ url: command.url }),
      );

      await this.knowledgeBaseRepository.assignSourceToKnowledgeBase(
        source.id,
        command.knowledgeBaseId,
      );

      return source;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error adding URL to knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError(
        'Error adding URL to knowledge base',
        { error: error as Error },
      );
    }
  }
}
