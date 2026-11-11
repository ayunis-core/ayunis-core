import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { OpenAIUnexpectedError } from 'src/domain/openai-compat/application/openai-compat.errors';
import { OpenAIModelMapper } from 'src/domain/openai-compat/application/mappers/openai-model.mapper';
import type { OpenAIModelListResponse } from 'src/domain/openai-compat/application/types/openai-model.types';
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
    this.logger.log({ orgId: query.orgId }, 'Listing OpenAI-compatible models');

    try {
      const permitted = await this.getPermittedLanguageModelsUseCase.execute(
        new GetPermittedLanguageModelsQuery(query.orgId),
      );

      // An org can hold several grants (org and team) for one catalog model.
      const byAlias = new Map<string, LanguageModel>();
      for (const { model } of permitted) {
        if (!byAlias.has(model.alias)) {
          byAlias.set(model.alias, model);
        }
      }

      return this.modelMapper.toListResponse([...byAlias.values()]);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error listing OpenAI-compatible models',
      );
      throw new OpenAIUnexpectedError(error);
    }
  }
}
