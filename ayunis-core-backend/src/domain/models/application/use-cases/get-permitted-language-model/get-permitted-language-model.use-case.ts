import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { GetPermittedLanguageModelQuery } from './get-permitted-language-model.query';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  ModelNotFoundByIdError,
  UnexpectedModelError,
} from '../../models.errors';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class GetPermittedLanguageModelUseCase {
  private readonly logger = new Logger(GetPermittedLanguageModelUseCase.name);
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(
    query: GetPermittedLanguageModelQuery,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('getPermittedLanguageModel', {
      query,
    });
    try {
      const model = await this.permittedModelsRepository.findOneLanguage(query);
      if (!model) {
        this.logger.error('model not found', {
          query,
        });
        throw new ModelNotFoundByIdError(query.id);
      }
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
