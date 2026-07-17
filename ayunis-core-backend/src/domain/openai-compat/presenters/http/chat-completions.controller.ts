import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import type { Subscription } from 'rxjs';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { RequireSubscription } from 'src/iam/authorization/application/decorators/subscription.decorator';
import {
  SubscriptionGuard,
  RequestWithSubscriptionContext,
} from 'src/iam/authorization/application/guards/subscription.guard';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { IncrementTrialMessagesCommand } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.command';
import { Public } from 'src/common/guards/public.guard';
import { ExecuteOpenAIChatCompletionUseCase } from '../../application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.use-case';
import { ExecuteOpenAIChatCompletionCommand } from '../../application/use-cases/execute-openai-chat-completion/execute-openai-chat-completion.command';
import { ChatCompletionRequestDto } from './dto/chat-completion-request.dto';
import { OpenAIExceptionFilter } from './filters/openai-exception.filter';

/**
 * OpenAI-compatible chat-completions endpoint. Thin shell — all
 * orchestration lives in `ExecuteOpenAIChatCompletionUseCase`.
 *
 * Auth: `@UseGuards(AuthGuard('api-key'), SubscriptionGuard)` overrides the
 * global `JwtAuthGuard` for this controller. The bearer strategy is the only
 * one that can authenticate this route. `SubscriptionGuard` is bound here
 * (rather than relying on the global APP_GUARD instance) so it runs AFTER
 * api-key auth populates `request.user` — guard ordering in NestJS goes
 * global → controller → route, and the global instance defers on `@Public()`
 * routes where no principal is available yet.
 *
 * Exception handling uses TWO registrations of `OpenAIExceptionFilter`:
 * - `@UseFilters` (here): wins over the global `UnauthorizedExceptionFilter`
 *   for runtime errors thrown DURING dispatch (auth, validation, domain
 *   errors) — controller-scoped filters beat global ones in NestJS.
 * - APP_FILTER (in OpenAICompatModule): catches errors raised BEFORE
 *   dispatch (body-parser failures) that controller-scoped filters never
 *   see. The same filter instance, registered at both scopes so both
 *   paths produce the OpenAI envelope.
 */
@Controller('openai-compat/v1/chat')
@Public() // bypass the global JwtAuthGuard; AuthGuard('api-key') takes over
@UseGuards(AuthGuard('api-key'), SubscriptionGuard)
@RequireSubscription({ type: SubscriptionType.USAGE_BASED })
@UseFilters(OpenAIExceptionFilter)
@RateLimit({ limit: 60, windowMs: 60_000 })
export class ChatCompletionsController {
  private readonly logger = new Logger(ChatCompletionsController.name);

  constructor(
    private readonly useCase: ExecuteOpenAIChatCompletionUseCase,
    private readonly contextService: ContextService,
    private readonly incrementTrialMessagesUseCase: IncrementTrialMessagesUseCase,
  ) {}

  @Post('completions')
  async create(
    @Body() dto: ChatCompletionRequestDto,
    @Req() request: RequestWithSubscriptionContext,
    @Res() response: Response,
  ): Promise<void> {
    const principal = this.resolvePrincipal();
    const command = new ExecuteOpenAIChatCompletionCommand(dto, principal);

    this.maybeIncrementTrial(request, principal.orgId);

    if (dto.stream) {
      await this.streamCompletion(command, request, response);
      return;
    }

    const result = await this.useCase.executeNonStreaming(command);
    response.status(200).json(result);
  }

  private resolvePrincipal(): {
    apiKeyId: UUID;
    orgId: UUID;
  } {
    // ApiKeyStrategy populates these via UserContextInterceptor (iter 2).
    // Throwing here means the guard somehow let an unauthenticated
    // request through; surfaces as a 500 'server_error' to the client.
    const apiKeyId = this.contextService.get('apiKeyId');
    const orgId = this.contextService.get('orgId');
    if (!apiKeyId || !orgId) {
      throw new Error('apiKeyId or orgId missing from context after auth');
    }
    return { apiKeyId, orgId };
  }

  private maybeIncrementTrial(
    request: RequestWithSubscriptionContext,
    orgId: UUID,
  ): void {
    if (!request.subscriptionContext?.hasRemainingTrialMessages) {
      return;
    }
    // Fire-and-forget — mirrors RunsController.send-message. The trial
    // counter is a soft cap; failing to increment is logged but never blocks
    // a request that has already passed the gate.
    void this.incrementTrialMessagesUseCase
      .execute(new IncrementTrialMessagesCommand(orgId))
      .catch((error: unknown) => {
        this.logger.warn('Failed to increment trial messages', {
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
  }

  private async streamCompletion(
    command: ExecuteOpenAIChatCompletionCommand,
    request: RequestWithSubscriptionContext,
    response: Response,
  ): Promise<void> {
    const stream$ = await this.useCase.executeStreaming(command);

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    let subscription: Subscription | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        subscription = stream$.subscribe({
          next: (chunk) => {
            if (response.writableEnded) return;
            response.write(`data: ${JSON.stringify(chunk)}\n\n`);
          },
          error: (err: unknown) =>
            reject(err instanceof Error ? err : new Error(String(err))),
          complete: () => resolve(),
        });

        // RxJS can throw synchronously from the producer factory; if the
        // subscribe call itself completes without setting subscription,
        // the listener below is what we rely on.
        request.on('close', () => {
          // Client disconnected — abort the upstream stream. This triggers
          // `finalize` inside the use case which records the partial usage
          // row (AYC-92 streaming usage-on-disconnect bug fix).
          subscription?.unsubscribe();
          resolve();
        });
      });

      if (!response.writableEnded) {
        response.write('data: [DONE]\n\n');
        response.end();
      }
    } finally {
      subscription?.unsubscribe();
    }
  }
}
