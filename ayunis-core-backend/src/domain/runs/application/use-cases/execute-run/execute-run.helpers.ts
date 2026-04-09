import type { UUID } from 'crypto';
import type { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import { FindOneAgentQuery } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.query';
import { AgentNotFoundError } from 'src/domain/agents/application/agents.errors';
import type { Agent } from 'src/domain/agents/domain/agent.entity';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.query';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import {
  RunNoModelFoundError,
  ThreadAgentNoLongerAccessibleError,
} from '../../runs.errors';

export async function resolveThreadAgent(
  findOneAgentUseCase: FindOneAgentUseCase,
  thread: Thread,
  threadId: UUID,
): Promise<Agent | undefined> {
  if (!thread.agentId) return undefined;
  try {
    return (
      await findOneAgentUseCase.execute(new FindOneAgentQuery(thread.agentId))
    ).agent;
  } catch (error) {
    if (error instanceof AgentNotFoundError) {
      throw new ThreadAgentNoLongerAccessibleError(threadId, thread.agentId);
    }
    throw error;
  }
}

export function pickModel(
  thread: Thread,
  agent?: Agent,
): PermittedLanguageModel {
  if (agent) return agent.model;
  if (thread.model) return thread.model;
  throw new RunNoModelFoundError({
    threadId: thread.id,
    userId: thread.userId,
  });
}

export async function shouldEnforceFairUseQuota(
  hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase,
  orgId: UUID,
): Promise<boolean> {
  const { hasActiveSubscription, subscriptionType } =
    await hasActiveSubscriptionUseCase.execute(
      new HasActiveSubscriptionQuery(orgId),
    );

  if (subscriptionType === SubscriptionType.USAGE_BASED) {
    return false;
  }

  if (hasActiveSubscription && subscriptionType === null) {
    return false;
  }

  return true;
}
