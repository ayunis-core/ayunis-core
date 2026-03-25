import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { UserMessageCreatedEvent } from 'src/domain/messages/application/events/user-message-created.event';
import { AssistantMessageCreatedEvent } from 'src/domain/messages/application/events/assistant-message-created.event';
import { RunExecutedEvent } from 'src/domain/runs/application/events/run-executed.event';
import { InferenceCompletedEvent } from 'src/domain/runs/application/events/inference-completed.event';
import { TokensConsumedEvent } from 'src/domain/runs/application/events/tokens-consumed.event';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { ThreadMessageAddedEvent } from 'src/domain/threads/application/events/thread-message-added.event';
import {
  AYUNIS_USER_CREATIONS_TOTAL,
  AYUNIS_MESSAGES_TOTAL,
  AYUNIS_USER_ACTIVITY_TOTAL,
  AYUNIS_INFERENCE_DURATION_SECONDS,
  AYUNIS_INFERENCE_ERRORS_TOTAL,
  AYUNIS_TOKENS_TOTAL,
  AYUNIS_TOOL_USES_TOTAL,
  AYUNIS_THREAD_MESSAGE_COUNT,
} from '../metrics.constants';
import { safeMetric } from '../metrics.utils';

/**
 * Subscribes to domain events and records the corresponding Prometheus
 * metrics. This consolidates all metric recording that previously lived
 * in individual use cases and services.
 */
@Injectable()
export class PrometheusMetricsListener {
  private readonly logger = new Logger(PrometheusMetricsListener.name);

  constructor(
    @InjectMetric(AYUNIS_USER_CREATIONS_TOTAL)
    private readonly userCreationsCounter: Counter<string>,
    @InjectMetric(AYUNIS_MESSAGES_TOTAL)
    private readonly messagesCounter: Counter<string>,
    @InjectMetric(AYUNIS_USER_ACTIVITY_TOTAL)
    private readonly userActivityCounter: Counter<string>,
    @InjectMetric(AYUNIS_INFERENCE_DURATION_SECONDS)
    private readonly inferenceHistogram: Histogram<string>,
    @InjectMetric(AYUNIS_INFERENCE_ERRORS_TOTAL)
    private readonly inferenceErrorsCounter: Counter<string>,
    @InjectMetric(AYUNIS_TOKENS_TOTAL)
    private readonly tokensCounter: Counter<string>,
    @InjectMetric(AYUNIS_TOOL_USES_TOTAL)
    private readonly toolUsesCounter: Counter<string>,
    @InjectMetric(AYUNIS_THREAD_MESSAGE_COUNT)
    private readonly threadMessageHistogram: Histogram<string>,
  ) {}

  @OnEvent(UserCreatedEvent.EVENT_NAME)
  handleUserCreated(event: UserCreatedEvent): void {
    safeMetric(this.logger, () => {
      this.userCreationsCounter.inc({
        org_id: event.orgId,
        department: normalizeDepartment(event.department),
      });
    });
  }

  @OnEvent(UserMessageCreatedEvent.EVENT_NAME)
  handleUserMessageCreated(event: UserMessageCreatedEvent): void {
    safeMetric(this.logger, () => {
      this.messagesCounter.inc({
        user_id: event.userId,
        org_id: event.orgId,
        role: 'user',
      });
    });
  }

  @OnEvent(AssistantMessageCreatedEvent.EVENT_NAME)
  handleAssistantMessageCreated(event: AssistantMessageCreatedEvent): void {
    safeMetric(this.logger, () => {
      this.messagesCounter.inc({
        user_id: event.userId,
        org_id: event.orgId,
        role: 'assistant',
      });
    });
  }

  @OnEvent(RunExecutedEvent.EVENT_NAME)
  handleRunExecuted(event: RunExecutedEvent): void {
    safeMetric(this.logger, () => {
      this.userActivityCounter.inc({
        user_id: event.userId,
        org_id: event.orgId,
      });
    });
  }

  @OnEvent(InferenceCompletedEvent.EVENT_NAME)
  handleInferenceCompleted(event: InferenceCompletedEvent): void {
    const streamingLabel = event.streaming ? 'true' : 'false';

    safeMetric(this.logger, () => {
      this.inferenceHistogram.observe(
        {
          model: event.model,
          provider: event.provider,
          streaming: streamingLabel,
        },
        event.durationMs / 1000,
      );
    });

    if (event.error) {
      safeMetric(this.logger, () => {
        this.inferenceErrorsCounter.inc({
          model: event.model,
          provider: event.provider,
          error_type: event.error!,
          streaming: streamingLabel,
        });
      });
    }
  }

  @OnEvent(TokensConsumedEvent.EVENT_NAME)
  handleTokensConsumed(event: TokensConsumedEvent): void {
    const baseLabels = {
      user_id: event.userId,
      org_id: event.orgId,
      model: event.model,
      provider: event.provider,
    };

    if (event.inputTokens > 0) {
      safeMetric(this.logger, () => {
        this.tokensCounter.inc(
          { ...baseLabels, direction: 'input' },
          event.inputTokens,
        );
      });
    }

    if (event.outputTokens > 0) {
      safeMetric(this.logger, () => {
        this.tokensCounter.inc(
          { ...baseLabels, direction: 'output' },
          event.outputTokens,
        );
      });
    }
  }

  @OnEvent(ToolUsedEvent.EVENT_NAME)
  handleToolUsed(event: ToolUsedEvent): void {
    safeMetric(this.logger, () => {
      this.toolUsesCounter.inc({
        user_id: event.userId,
        org_id: event.orgId,
        tool_name: event.toolName,
      });
    });
  }

  @OnEvent(ThreadMessageAddedEvent.EVENT_NAME)
  handleThreadMessageAdded(event: ThreadMessageAddedEvent): void {
    safeMetric(this.logger, () => {
      this.threadMessageHistogram.observe(
        { user_id: event.userId, org_id: event.orgId },
        event.messageCount,
      );
    });
  }
}

/**
 * Normalizes the department label for Prometheus. The "other:" prefix
 * is stripped to a plain "other" to keep cardinality low.
 */
function normalizeDepartment(department?: string): string {
  if (!department) return 'none';
  return department.startsWith('other:') ? 'other' : department;
}
