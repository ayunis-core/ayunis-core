import { Module } from '@nestjs/common';

import { ApiKeysModule } from 'src/iam/api-keys/api-keys.module';
import { ModelsModule } from '../../../models.module';

import { ChatCompletionsController } from './chat-completions.controller';
import { OpenAIRequestMapper } from './mappers/openai-request.mapper';
import { OpenAIResponseMapper } from './mappers/openai-response.mapper';
import { OpenAIStreamMapper } from './mappers/openai-stream.mapper';
import { OpenAIErrorMapper } from './mappers/openai-error.mapper';
import { OpenAIChatCompletionsMappers } from './mappers/openai-mappers';

@Module({
  imports: [ModelsModule, ApiKeysModule],
  controllers: [ChatCompletionsController],
  providers: [
    OpenAIRequestMapper,
    OpenAIResponseMapper,
    OpenAIStreamMapper,
    OpenAIErrorMapper,
    OpenAIChatCompletionsMappers,
  ],
})
export class OpenAICompatModule {}
