import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  OpenAIModelNotFoundError,
  OpenAIUnexpectedError,
} from 'src/domain/openai-compat/application/openai-compat.errors';
import type { OpenAIModelObject } from 'src/domain/openai-compat/application/types/openai-model.types';
import { ListOpenAIModelsUseCase } from 'src/domain/openai-compat/application/use-cases/list-openai-models/list-openai-models.use-case';
import { ListOpenAIModelsQuery } from 'src/domain/openai-compat/application/use-cases/list-openai-models/list-openai-models.query';
import { GetOpenAIModelQuery } from './get-openai-model.query';

@Injectable()
export class GetOpenAIModelUseCase {
  private readonly logger = new Logger(GetOpenAIModelUseCase.name);

  constructor(
    private readonly listOpenAIModelsUseCase: ListOpenAIModelsUseCase,
  ) {}

  async execute(query: GetOpenAIModelQuery): Promise<OpenAIModelObject> {
    this.logger.log(
      {
        orgId: query.orgId,
        modelName: query.modelName,
      },
      'Getting OpenAI-compatible model',
    );

    try {
      const list = await this.listOpenAIModelsUseCase.execute(
        new ListOpenAIModelsQuery(query.orgId),
      );
      const match = list.data.find((model) => model.id === query.modelName);
      if (!match) {
        throw new OpenAIModelNotFoundError(query.modelName);
      }
      return match;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error getting OpenAI-compatible model',
      );
      throw new OpenAIUnexpectedError(error);
    }
  }
}
