import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  OpenAIModelNotFoundError,
  OpenAIUnexpectedError,
} from '../../openai-compat.errors';
import type { OpenAIModelObject } from '../../types/openai-model.types';
import { ListOpenAIModelsUseCase } from '../list-openai-models/list-openai-models.use-case';
import { ListOpenAIModelsQuery } from '../list-openai-models/list-openai-models.query';
import { GetOpenAIModelQuery } from './get-openai-model.query';

@Injectable()
export class GetOpenAIModelUseCase {
  constructor(
    @InjectPinoLogger(GetOpenAIModelUseCase.name)
    private readonly logger: PinoLogger,

    private readonly listOpenAIModelsUseCase: ListOpenAIModelsUseCase,
  ) {}

  async execute(query: GetOpenAIModelQuery): Promise<OpenAIModelObject> {
    this.logger.info(
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
