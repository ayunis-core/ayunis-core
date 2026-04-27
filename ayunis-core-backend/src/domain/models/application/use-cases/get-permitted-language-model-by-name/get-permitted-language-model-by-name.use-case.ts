import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedLanguageModel } from '../../../domain/permitted-model.entity';
import { GetPermittedLanguageModelByNameQuery } from './get-permitted-language-model-by-name.query';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  AmbiguousModelNameError,
  ModelNotFoundByNameError,
  UnexpectedModelError,
} from '../../models.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class GetPermittedLanguageModelByNameUseCase {
  private readonly logger = new Logger(
    GetPermittedLanguageModelByNameUseCase.name,
  );
  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    query: GetPermittedLanguageModelByNameQuery,
  ): Promise<PermittedLanguageModel> {
    this.logger.log('getPermittedLanguageModelByName');
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    try {
      const models = await this.permittedModelsRepository.findLanguageByName({
        name: query.name,
        orgId,
      });
      if (models.length === 0) {
        throw new ModelNotFoundByNameError(query.name);
      }
      if (models.length > 1) {
        throw new AmbiguousModelNameError(
          query.name,
          models.map((m) => m.id),
        );
      }
      return models[0];
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }
}
