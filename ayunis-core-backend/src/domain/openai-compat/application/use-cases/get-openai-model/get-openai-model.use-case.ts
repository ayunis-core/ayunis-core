import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
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
  private readonly logger = new Logger(GetOpenAIModelUseCase.name);

  constructor(
    private readonly listOpenAIModelsUseCase: ListOpenAIModelsUseCase,
  ) {}

  @HandleUnexpectedErrors(OpenAIUnexpectedError)
  async execute(query: GetOpenAIModelQuery): Promise<OpenAIModelObject> {
    this.logger.log('Getting OpenAI-compatible model', {
      orgId: query.orgId,
      modelName: query.modelName,
    });

    const list = await this.listOpenAIModelsUseCase.execute(
      new ListOpenAIModelsQuery(query.orgId),
    );
    const match = list.data.find((model) => model.id === query.modelName);
    if (!match) {
      throw new OpenAIModelNotFoundError(query.modelName);
    }
    return match;
  }
}
