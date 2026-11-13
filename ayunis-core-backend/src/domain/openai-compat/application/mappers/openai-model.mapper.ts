import { Injectable } from '@nestjs/common';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type {
  OpenAIModelListResponse,
  OpenAIModelObject,
} from 'src/domain/openai-compat/application/types/openai-model.types';

@Injectable()
export class OpenAIModelMapper {
  toModelObject(model: LanguageModel): OpenAIModelObject {
    return {
      // chat/completions resolves the request's "model" field against the
      // alias, so whatever this list returns is directly usable there.
      id: model.alias,
      object: 'model',
      created: Math.floor(model.createdAt.getTime() / 1000),
      owned_by: model.provider,
    };
  }

  toListResponse(models: LanguageModel[]): OpenAIModelListResponse {
    return {
      object: 'list',
      data: models.map((model) => this.toModelObject(model)),
    };
  }
}
