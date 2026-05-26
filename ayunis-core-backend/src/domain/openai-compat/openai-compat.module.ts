import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ModelsModule } from '../models/models.module';
import { RunsModule } from '../runs/runs.module';
import { ChatCompletionsController } from './presenters/http/chat-completions.controller';
import { ExecuteOpenAIChatCompletionUseCase } from './application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.use-case';
import { OpenAIRequestMapper } from './application/mappers/openai-request.mapper';
import { OpenAIResponseMapper } from './application/mappers/openai-response.mapper';
import { OpenAIStreamMapper } from './application/mappers/openai-stream.mapper';
import { OpenAIErrorMapper } from './application/mappers/openai-error.mapper';
import { OpenAIExceptionFilter } from './presenters/http/filters/openai-exception.filter';

@Module({
  imports: [
    // Required to consume GetInferenceUseCase, StreamInferenceUseCase,
    // and PermittedModelsRepository.
    ModelsModule,
    // Required to consume InferenceUsageGuard.
    RunsModule,
    // ApiKeyStrategy is registered globally by IamModule; AuthGuard('api-key')
    // resolves it from Passport at request time and needs no import here.
    // `@Public()` is read by JwtAuthGuard via Reflector — also no import needed.
  ],
  controllers: [ChatCompletionsController],
  providers: [
    ExecuteOpenAIChatCompletionUseCase,
    OpenAIRequestMapper,
    OpenAIResponseMapper,
    OpenAIStreamMapper,
    OpenAIErrorMapper,
    OpenAIExceptionFilter,
    // ALSO registered as APP_FILTER (in addition to controller-scoped
    // @UseFilters on ChatCompletionsController) so it can intercept errors
    // raised BEFORE the controller dispatches — most importantly Nest's
    // body-parser BadRequestException for malformed JSON, which OpenAI SDK
    // clients expect in the standard envelope. `useExisting` shares the
    // single instance with the controller-scoped binding.
    //
    // Controller-scoped > global APP_FILTER in NestJS resolution, so
    // runtime exceptions (e.g. UnauthorizedException from the api-key
    // guard, which AuthenticationModule's UnauthorizedExceptionFilter
    // would otherwise hijack with a more specific @Catch) flow through
    // the @UseFilters binding first.
    {
      provide: APP_FILTER,
      useExisting: OpenAIExceptionFilter,
    },
  ],
})
export class OpenAICompatModule {}
