import { Controller, Get, Param, UseFilters, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { RateLimit } from 'src/iam/authorization/application/decorators/rate-limit.decorator';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { SubscriptionGuard } from 'src/iam/authorization/application/guards/subscription.guard';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { Public } from 'src/common/guards/public.guard';
import { ListOpenAIModelsUseCase } from '../../application/use-cases/list-openai-models/list-openai-models.use-case';
import { ListOpenAIModelsQuery } from '../../application/use-cases/list-openai-models/list-openai-models.query';
import { GetOpenAIModelUseCase } from '../../application/use-cases/get-openai-model/get-openai-model.use-case';
import { GetOpenAIModelQuery } from '../../application/use-cases/get-openai-model/get-openai-model.query';
import type {
  OpenAIModelListResponse,
  OpenAIModelObject,
} from '../../application/types/openai-model.types';
import { OpenAIExceptionFilter } from './filters/openai-exception.filter';

/**
 * OpenAI-compatible model endpoints. Many OpenAI SDK clients verify a
 * connection and populate their model pickers via `GET /v1/models`, so
 * these routes exist purely for client compatibility.
 *
 * The guard/filter stack mirrors `ChatCompletionsController` — see the
 * comment there for why `SubscriptionGuard` is bound controller-scoped
 * (it must run AFTER api-key auth populates `request.user`) and why
 * `OpenAIExceptionFilter` is registered via `@UseFilters` in addition to
 * the module-level APP_FILTER.
 */
@Controller('openai-compat/v1/models')
@Public() // bypass the global JwtAuthGuard; AuthGuard('api-key') takes over
@UseGuards(AuthGuard('api-key'), SubscriptionGuard)
@RequireSubscription({ type: SubscriptionType.USAGE_BASED })
@UseFilters(OpenAIExceptionFilter)
@RateLimit({ limit: 60, windowMs: 60_000 })
export class ModelsController {
  constructor(
    private readonly listOpenAIModelsUseCase: ListOpenAIModelsUseCase,
    private readonly getOpenAIModelUseCase: GetOpenAIModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Get()
  async list(): Promise<OpenAIModelListResponse> {
    return this.listOpenAIModelsUseCase.execute(
      new ListOpenAIModelsQuery(this.resolveOrgId()),
    );
  }

  @Get(':model')
  async retrieve(@Param('model') model: string): Promise<OpenAIModelObject> {
    return this.getOpenAIModelUseCase.execute(
      new GetOpenAIModelQuery(this.resolveOrgId(), model),
    );
  }

  private resolveOrgId(): UUID {
    // ApiKeyStrategy populates the context. Throwing here means the guard
    // somehow let an unauthenticated request through; surfaces as a 500
    // 'server_error' to the client.
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new Error('orgId missing from context after auth');
    }
    return orgId;
  }
}
