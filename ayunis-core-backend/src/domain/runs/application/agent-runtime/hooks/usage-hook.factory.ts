import {
  AgentRuntimeError,
  type AfterModelCallContext,
  type BeforeProviderCallContext,
  type Hook,
} from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { assistantMessageId } from 'src/domain/runs/application/agent-runtime/message-id';
import {
  type InferencePrincipal,
  InferenceUsageGuard,
} from 'src/domain/runs/application/services/inference-usage-guard.service';
import {
  ApiKeyCreditLimitExceededError,
  TeamCreditLimitExceededError,
  UserCreditLimitExceededError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';

interface UsageHookParams {
  model: LanguageModel;
  principal: InferencePrincipal;
}

type ReservationStacks = Map<number, UUID[]>;

/**
 * Builds the usage-metering hook: every physical provider attempt is durably
 * recorded before the loop continues, including interrupted retry attempts,
 * and credit limits are rechecked before each later attempt.
 * Cached prompt tokens are folded into billed input because the provider's
 * `inputTokens` excludes cache-covered tokens.
 */
@Injectable()
export class UsageHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: UsageHookParams): Hook {
    const reservations: ReservationStacks = new Map();
    return {
      name: 'ayunis-usage',
      modelCallInterruptedFailureMode: 'critical',
      beforeProviderCall: async (ctx) => {
        const authorization = await authorizeModelCall(
          this.inferenceUsageGuard,
          params,
          ctx,
        );
        ctx.setMaxOutputTokens(authorization?.maxOutputTokens);
        if (authorization) {
          trackReservation(
            reservations,
            ctx.iteration,
            authorization.reservationId,
          );
        }
      },
      afterModelCall: (ctx) =>
        collectUsageAndReleaseReservation(
          this.inferenceUsageGuard,
          params.model,
          reservations,
          ctx,
        ),
      modelCallInterrupted: (ctx) =>
        collectUsageAndReleaseReservation(
          this.inferenceUsageGuard,
          params.model,
          reservations,
          ctx,
        ),
      runEnd: () =>
        releaseAllReservations(this.inferenceUsageGuard, reservations),
    };
  }
}

async function collectUsageAndReleaseReservation(
  guard: InferenceUsageGuard,
  model: LanguageModel,
  reservations: ReservationStacks,
  ctx: Pick<
    AfterModelCallContext,
    'context' | 'iteration' | 'message' | 'usage'
  > & { hasProviderOutput?: boolean },
): Promise<void> {
  try {
    await collectReportedUsage(guard, model, ctx);
  } catch (error) {
    // The provider may already have billed this attempt. Drop only local
    // cleanup ownership so the durable reservation remains until its TTL.
    discardLatestReservation(reservations, ctx.iteration);
    throw error;
  }
  try {
    await releaseReservation(guard, reservations, ctx.iteration);
  } catch {
    // runEnd retries while the reservation remains in the map.
  }
}

function trackReservation(
  reservations: ReservationStacks,
  iteration: number,
  reservationId: UUID,
): void {
  const stack = reservations.get(iteration) ?? [];
  stack.push(reservationId);
  reservations.set(iteration, stack);
}

function discardLatestReservation(
  reservations: ReservationStacks,
  iteration: number,
): void {
  const stack = reservations.get(iteration);
  stack?.pop();
  if (stack?.length === 0) reservations.delete(iteration);
}

async function authorizeModelCall(
  guard: InferenceUsageGuard,
  params: { model: LanguageModel; principal: InferencePrincipal },
  ctx: BeforeProviderCallContext,
) {
  try {
    return await guard.authorizeModelCall(params.principal, params.model, {
      messages: ctx.messages,
      instructions: ctx.instructions,
      tools: ctx.tools.map(({ name, description, parameters }) => ({
        name,
        description,
        parameters,
      })),
    });
  } catch (error) {
    throw toRuntimeError(error);
  }
}

async function releaseReservation(
  guard: InferenceUsageGuard,
  reservations: ReservationStacks,
  iteration: number,
): Promise<void> {
  const stack = reservations.get(iteration);
  const reservationId = stack?.at(-1);
  if (!reservationId) return;
  await guard.releaseCreditReservation(reservationId);
  discardLatestReservation(reservations, iteration);
}

async function releaseAllReservations(
  guard: InferenceUsageGuard,
  reservations: ReservationStacks,
): Promise<void> {
  for (const iteration of [...reservations.keys()]) {
    while (reservations.has(iteration)) {
      await releaseReservation(guard, reservations, iteration);
    }
  }
}

async function collectReportedUsage(
  guard: InferenceUsageGuard,
  model: LanguageModel,
  ctx: Pick<
    AfterModelCallContext,
    'context' | 'iteration' | 'message' | 'usage'
  > & { hasProviderOutput?: boolean },
): Promise<void> {
  const usage = ctx.usage;
  const inputValues = [
    usage.inputTokens,
    usage.cacheReadInputTokens,
    usage.cacheWriteInputTokens,
  ];
  const hasInputUsage = inputValues.some((value) => value !== undefined);
  const hasReportedUsage = hasInputUsage || usage.outputTokens !== undefined;
  if (!hasReportedUsage) {
    const hasOutput = ctx.hasProviderOutput ?? ctx.message.content.length > 0;
    if (model.consumesCredits && hasOutput) {
      throw usageUnavailable();
    }
    return;
  }
  if (
    model.consumesCredits &&
    (!hasInputUsage || usage.outputTokens === undefined)
  ) {
    throw usageUnavailable();
  }
  await guard.collectUsageAndWait(
    model,
    {
      inputTokens: inputValues.reduce<number>(
        (total, value) => total + (value ?? 0),
        0,
      ),
      outputTokens: usage.outputTokens ?? 0,
    },
    assistantMessageId(ctx.context.runId, ctx.iteration),
    'agent_runtime',
  );
}

function usageUnavailable(): AgentRuntimeError {
  return new AgentRuntimeError(
    'USAGE_UNAVAILABLE',
    'Paid model call completed without complete usage data',
  );
}

function toRuntimeError(error: unknown): unknown {
  if (!isMappedLimitError(error)) return error;
  return new AgentRuntimeError(error.code, error.message, {
    details: error.metadata,
    cause: error,
  });
}

function isMappedLimitError(error: unknown): error is ApplicationError {
  return (
    error instanceof UserCreditLimitExceededError ||
    error instanceof TeamCreditLimitExceededError ||
    error instanceof ApiKeyCreditLimitExceededError ||
    error instanceof CreditBudgetExceededError
  );
}
