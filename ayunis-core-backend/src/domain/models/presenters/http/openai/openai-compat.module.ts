import { Module } from '@nestjs/common';

import { ApiKeysModule } from 'src/iam/api-keys/api-keys.module';
import { ModelsModule } from '../../../models.module';
import { LocalPermittedModelsRepositoryModule } from '../../../infrastructure/persistence/local-permitted-models/local-permitted-models-repository.module';

import { ChatCompletionsController } from './chat-completions.controller';
import { GetPermittedLanguageModelByNameUseCase } from '../../../application/use-cases/get-permitted-language-model-by-name/get-permitted-language-model-by-name.use-case';
import { OpenAIRequestMapper } from './mappers/openai-request.mapper';
import { OpenAIResponseMapper } from './mappers/openai-response.mapper';
import { OpenAIStreamMapper } from './mappers/openai-stream.mapper';
import { OpenAIErrorMapper } from './mappers/openai-error.mapper';
import { OpenAIChatCompletionsMappers } from './mappers/openai-mappers';

@Module({
  imports: [ModelsModule, ApiKeysModule, LocalPermittedModelsRepositoryModule],
  controllers: [ChatCompletionsController],
  providers: [
    GetPermittedLanguageModelByNameUseCase,
    OpenAIRequestMapper,
    OpenAIResponseMapper,
    OpenAIStreamMapper,
    OpenAIErrorMapper,
    OpenAIChatCompletionsMappers,
  ],
})
export class OpenAICompatModule {}
