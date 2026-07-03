import { Injectable } from '@nestjs/common';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type {
  OpenAIModelListResponse,
  OpenAIModelObject,
} from '../types/openai-model.types';

@Injectable()
export class OpenAIModelMapper {
  toModelObject(model: LanguageModel): OpenAIModelObject {
    return {
      // `id` must be the internal model name — chat/completions resolves the
      // request's "model" field against `Model.name`, so whatever this list
      // returns has to be directly usable there.
      id: model.name,
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
