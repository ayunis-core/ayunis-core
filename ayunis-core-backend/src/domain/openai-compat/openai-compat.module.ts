import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ModelsModule } from '../models/models.module';
import { RunsModule } from '../runs/runs.module';
import { AuthorizationModule } from 'src/iam/authorization/authorization.module';
import { ChatCompletionsController } from './presenters/http/chat-completions.controller';
import { ModelsController } from './presenters/http/models.controller';
import { ExecuteOpenAIChatCompletionUseCase } from './application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.use-case';
import { ListOpenAIModelsUseCase } from './application/use-cases/list-openai-models/list-openai-models.use-case';
import { GetOpenAIModelUseCase } from './application/use-cases/get-openai-model/get-openai-model.use-case';
import { OpenAIModelMapper } from './application/mappers/openai-model.mapper';
import { OpenAIRequestMapper } from './application/mappers/openai-request.mapper';
import { OpenAIResponseMapper } from './application/mappers/openai-response.mapper';
import { OpenAIStreamMapper } from './application/mappers/openai-stream.mapper';
import { OpenAIErrorMapper } from './application/mappers/openai-error.mapper';
import { OpenAIExceptionFilter } from './presenters/http/filters/openai-exception.filter';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';

@Module({
  imports: [
    // Required to consume GetInferenceUseCase, StreamInferenceUseCase,
    // and PermittedModelsRepository.
    ModelsModule,
    // Required to consume InferenceUsageGuard.
    RunsModule,
    // Provides SubscriptionGuard for `@UseGuards(AuthGuard('api-key'),
    // SubscriptionGuard)` so subscription gating runs AFTER api-key auth
    // populates `request.user`. Also exposes TrialsModule transitively, which
    // is how IncrementTrialMessagesUseCase reaches the controller for the
    // trial-message accounting path.
    AuthorizationModule,
    // ApiKeyStrategy is registered globally by IamModule; AuthGuard('api-key')
    // resolves it from Passport at request time and needs no import here.
    // `@Public()` is read by JwtAuthGuard via Reflector — also no import needed.
  ],
  controllers: [ChatCompletionsController, ModelsController],
  providers: [
    ExecuteOpenAIChatCompletionUseCase,
    ListOpenAIModelsUseCase,
    GetOpenAIModelUseCase,
    OpenAIModelMapper,
    OpenAIRequestMapper,
    OpenAIResponseMapper,
    OpenAIStreamMapper,
    OpenAIErrorMapper,
    // Injected into OpenAIExceptionFilter so non-openai-compat errors keep
    // the app-wide {code, message} response shape. This global @Catch()
    // filter shadows the ApplicationErrorFilter APP_FILTER registration in
    // AppModule (NestJS picks the last-registered matching global filter),
    // so it must delegate explicitly instead of falling back to NestJS
    // defaults via super.catch.
    ApplicationErrorFilter,
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
    // guard, which the global ApplicationErrorFilter would otherwise
    // handle with Nest's default body) flow through the @UseFilters
    // binding first.
    {
      provide: APP_FILTER,
      useExisting: OpenAIExceptionFilter,
    },
  ],
})
export class OpenAICompatModule {}
