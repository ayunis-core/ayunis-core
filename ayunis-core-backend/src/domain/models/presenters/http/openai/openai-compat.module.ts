import { Module } from '@nestjs/common';

import { ApiKeysModule } from 'src/iam/api-keys/api-keys.module';
import { QuotasModule } from 'src/iam/quotas/quotas.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { UsageModule } from 'src/domain/usage/usage.module';
import { ModelsModule } from '../../../models.module';

import { ChatCompletionsController } from './chat-completions.controller';
import { OpenAIRequestMapper } from './mappers/openai-request.mapper';
import { OpenAIResponseMapper } from './mappers/openai-response.mapper';
import { OpenAIStreamMapper } from './mappers/openai-stream.mapper';
import { OpenAIErrorMapper } from './mappers/openai-error.mapper';
import { OpenAIChatCompletionsMappers } from './mappers/openai-mappers';

@Module({
  imports: [
    ModelsModule,
    ApiKeysModule,
    QuotasModule,
    TrialsModule,
    UsageModule,
  ],
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
