import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { OpenAIUnexpectedError } from '../../openai-compat.errors';
import { OpenAIModelMapper } from '../../mappers/openai-model.mapper';
import type { OpenAIModelListResponse } from '../../types/openai-model.types';
import { ListOpenAIModelsQuery } from './list-openai-models.query';

@Injectable()
export class ListOpenAIModelsUseCase {
  private readonly logger = new Logger(ListOpenAIModelsUseCase.name);

  constructor(
    private readonly getPermittedLanguageModelsUseCase: GetPermittedLanguageModelsUseCase,
    private readonly modelMapper: OpenAIModelMapper,
  ) {}

  async execute(
    query: ListOpenAIModelsQuery,
  ): Promise<OpenAIModelListResponse> {
    this.logger.log('Listing OpenAI-compatible models', { orgId: query.orgId });

    try {
      const permitted = await this.getPermittedLanguageModelsUseCase.execute(
        new GetPermittedLanguageModelsQuery(query.orgId),
      );

      // Dedupe by name, first occurrence wins — chat/completions resolves the
      // "model" field with `find()` over the same list, so this keeps the
      // advertised ids exactly the set of names a completion request accepts.
      const byName = new Map<string, LanguageModel>();
      for (const { model } of permitted) {
        if (!byName.has(model.name)) {
          byName.set(model.name, model);
        }
      }

      return this.modelMapper.toListResponse([...byName.values()]);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error listing OpenAI-compatible models', {
        error: error as Error,
      });
      throw new OpenAIUnexpectedError(error);
    }
  }
}
