import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetPermittedLanguageModelsQuery } from './get-permitted-language-models.query';
import { Injectable, Logger } from '@nestjs/common';
import { UnexpectedModelError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetPermittedLanguageModelsUseCase {
  private readonly logger = new Logger(GetPermittedLanguageModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    query: GetPermittedLanguageModelsQuery,
  ): Promise<PermittedLanguageModel[]> {
    this.logger.log('Executing get permitted language models', {
      orgId: query.orgId,
    });
    try {
      return this.permittedModelsRepository.findManyLanguage(query.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error getting permitted language models', {
        orgId: query.orgId,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new UnexpectedModelError(error as Error);
    }
  }
}
