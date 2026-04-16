import type { UUID } from 'crypto';
import { PrometheusMetricsListener } from './prometheus-metrics.listener';
import { UserCreatedEvent } from 'src/iam/users/application/events/user-created.event';
import { UserMessageCreatedEvent } from 'src/domain/messages/application/events/user-message-created.event';
import { AssistantMessageCreatedEvent } from 'src/domain/messages/application/events/assistant-message-created.event';
import { RunExecutedEvent } from 'src/domain/runs/application/events/run-executed.event';
import { InferenceCompletedEvent } from 'src/domain/runs/application/events/inference-completed.event';
import { TokensConsumedEvent } from 'src/domain/runs/application/events/tokens-consumed.event';
import { ToolUsedEvent } from 'src/domain/runs/application/events/tool-used.event';
import { ThreadMessageAddedEvent } from 'src/domain/threads/application/events/thread-message-added.event';
import { MarketplaceSkillInstalledEvent } from 'src/domain/skills/application/events/marketplace-skill-installed.event';
import { MarketplaceIntegrationInstalledEvent } from 'src/domain/mcp/application/events/marketplace-integration-installed.event';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

const USER_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000002' as UUID;
const THREAD_ID = '00000000-0000-0000-0000-000000000003' as UUID;
const MESSAGE_ID = '00000000-0000-0000-0000-000000000004' as UUID;

function makeUser(overrides?: Partial<{ department: string }>): User {
  return new User({
    id: USER_ID,
    email: 'test@example.com',
    emailVerified: true,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    orgId: ORG_ID,
    name: 'Test User',
    hasAcceptedMarketing: false,
    department: overrides?.department,
  });
}

function mockCounter() {
  return { inc: jest.fn() };
}

function mockHistogram() {
  return { observe: jest.fn() };
}

describe('PrometheusMetricsListener', () => {
  let listener: PrometheusMetricsListener;
  let userCreationsCounter: ReturnType<typeof mockCounter>;
  let messagesCounter: ReturnType<typeof mockCounter>;
  let userActivityCounter: ReturnType<typeof mockCounter>;
  let inferenceHistogram: ReturnType<typeof mockHistogram>;
  let inferenceErrorsCounter: ReturnType<typeof mockCounter>;
  let tokensCounter: ReturnType<typeof mockCounter>;
  let toolUsesCounter: ReturnType<typeof mockCounter>;
  let threadMessageHistogram: ReturnType<typeof mockHistogram>;
  let marketplaceInstallsCounter: ReturnType<typeof mockCounter>;

  beforeEach(() => {
    userCreationsCounter = mockCounter();
    messagesCounter = mockCounter();
    userActivityCounter = mockCounter();
    inferenceHistogram = mockHistogram();
    inferenceErrorsCounter = mockCounter();
    tokensCounter = mockCounter();
    toolUsesCounter = mockCounter();
    threadMessageHistogram = mockHistogram();
    marketplaceInstallsCounter = mockCounter();

    listener = new PrometheusMetricsListener(
      userCreationsCounter as never,
      messagesCounter as never,
      userActivityCounter as never,
      inferenceHistogram as never,
      inferenceErrorsCounter as never,
      tokensCounter as never,
      toolUsesCounter as never,
      threadMessageHistogram as never,
      marketplaceInstallsCounter as never,
    );
  });

  describe('handleUserCreated', () => {
    it('should increment user creations counter with org and department', () => {
      listener.handleUserCreated(
        new UserCreatedEvent(
          USER_ID,
          ORG_ID,
          makeUser({ department: 'engineering' }),
        ),
      );

      expect(userCreationsCounter.inc).toHaveBeenCalledWith({
        org_id: ORG_ID,
        department: 'engineering',
      });
    });

    it('should normalize "other:" prefixed departments to "other"', () => {
      listener.handleUserCreated(
        new UserCreatedEvent(
          USER_ID,
          ORG_ID,
          makeUser({ department: 'other:custom' }),
        ),
      );

      expect(userCreationsCounter.inc).toHaveBeenCalledWith({
        org_id: ORG_ID,
        department: 'other',
      });
    });

    it('should use "none" when department is undefined', () => {
      listener.handleUserCreated(
        new UserCreatedEvent(USER_ID, ORG_ID, makeUser()),
      );

      expect(userCreationsCounter.inc).toHaveBeenCalledWith({
        org_id: ORG_ID,
        department: 'none',
      });
    });
  });

  describe('handleUserMessageCreated', () => {
    it('should increment messages counter with role "user"', () => {
      listener.handleUserMessageCreated(
        new UserMessageCreatedEvent(USER_ID, ORG_ID, THREAD_ID, MESSAGE_ID),
      );

      expect(messagesCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
        role: 'user',
      });
    });
  });

  describe('handleAssistantMessageCreated', () => {
    it('should increment messages counter with role "assistant"', () => {
      listener.handleAssistantMessageCreated(
        new AssistantMessageCreatedEvent(
          USER_ID,
          ORG_ID,
          THREAD_ID,
          MESSAGE_ID,
        ),
      );

      expect(messagesCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
        role: 'assistant',
      });
    });
  });

  describe('handleRunExecuted', () => {
    it('should increment user activity counter', () => {
      listener.handleRunExecuted(new RunExecutedEvent(USER_ID, ORG_ID));

      expect(userActivityCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
      });
    });
  });

  describe('handleInferenceCompleted', () => {
    it('should observe inference duration histogram', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'gpt-4',
          'openai',
          false,
          1500,
        ),
      );

      expect(inferenceHistogram.observe).toHaveBeenCalledWith(
        { model: 'gpt-4', provider: 'openai', streaming: 'false' },
        1.5,
      );
    });

    it('should observe with streaming=true for streaming inference', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'claude-3',
          'anthropic',
          true,
          2000,
        ),
      );

      expect(inferenceHistogram.observe).toHaveBeenCalledWith(
        { model: 'claude-3', provider: 'anthropic', streaming: 'true' },
        2,
      );
    });

    it('should classify and increment error counter when error is present', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'gpt-4',
          'openai',
          false,
          500,
          {
            message: 'Too Many Requests',
            statusCode: 429,
          },
        ),
      );

      expect(inferenceErrorsCounter.inc).toHaveBeenCalledWith({
        model: 'gpt-4',
        provider: 'openai',
        error_type: 'rate_limit',
        streaming: 'false',
      });
    });

    it('should classify error by message when no statusCode', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'gpt-4',
          'openai',
          false,
          500,
          {
            message: 'Request timed out',
          },
        ),
      );

      expect(inferenceErrorsCounter.inc).toHaveBeenCalledWith({
        model: 'gpt-4',
        provider: 'openai',
        error_type: 'timeout',
        streaming: 'false',
      });
    });

    it('should classify unknown errors as "unknown"', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'gpt-4',
          'openai',
          false,
          500,
          {
            message: 'Something completely unexpected happened',
          },
        ),
      );

      expect(inferenceErrorsCounter.inc).toHaveBeenCalledWith({
        model: 'gpt-4',
        provider: 'openai',
        error_type: 'unknown',
        streaming: 'false',
      });
    });

    it('should not increment error counter when there is no error', () => {
      listener.handleInferenceCompleted(
        new InferenceCompletedEvent(
          USER_ID,
          ORG_ID,
          'gpt-4',
          'openai',
          false,
          500,
        ),
      );

      expect(inferenceErrorsCounter.inc).not.toHaveBeenCalled();
    });
  });

  describe('handleTokensConsumed', () => {
    it('should increment tokens counter for input and output', () => {
      listener.handleTokensConsumed(
        new TokensConsumedEvent(USER_ID, ORG_ID, 'gpt-4', 'openai', 100, 50),
      );

      expect(tokensCounter.inc).toHaveBeenCalledWith(
        {
          user_id: USER_ID,
          org_id: ORG_ID,
          model: 'gpt-4',
          provider: 'openai',
          direction: 'input',
        },
        100,
      );
      expect(tokensCounter.inc).toHaveBeenCalledWith(
        {
          user_id: USER_ID,
          org_id: ORG_ID,
          model: 'gpt-4',
          provider: 'openai',
          direction: 'output',
        },
        50,
      );
    });

    it('should skip zero-value token counts', () => {
      listener.handleTokensConsumed(
        new TokensConsumedEvent(USER_ID, ORG_ID, 'gpt-4', 'openai', 100, 0),
      );

      expect(tokensCounter.inc).toHaveBeenCalledTimes(1);
      expect(tokensCounter.inc).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'input' }),
        100,
      );
    });
  });

  describe('handleToolUsed', () => {
    it('should increment tool uses counter', () => {
      listener.handleToolUsed(new ToolUsedEvent(USER_ID, ORG_ID, 'web_search'));

      expect(toolUsesCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
        tool_name: 'web_search',
      });
    });
  });

  describe('handleThreadMessageAdded', () => {
    it('should observe thread message count histogram', () => {
      listener.handleThreadMessageAdded(
        new ThreadMessageAddedEvent(USER_ID, ORG_ID, THREAD_ID, 5),
      );

      expect(threadMessageHistogram.observe).toHaveBeenCalledWith(
        { user_id: USER_ID, org_id: ORG_ID },
        5,
      );
    });
  });

  describe('safeMetric wrapping', () => {
    it('should not throw when a metric operation fails', () => {
      userCreationsCounter.inc.mockImplementation(() => {
        throw new Error('Prometheus failure');
      });

      expect(() =>
        listener.handleUserCreated(
          new UserCreatedEvent(USER_ID, ORG_ID, makeUser()),
        ),
      ).not.toThrow();
    });
  });

  describe('handleMarketplaceSkillInstalled', () => {
    it('should increment marketplace installs counter with type "skill" and slug', () => {
      listener.handleMarketplaceSkillInstalled(
        new MarketplaceSkillInstalledEvent(
          USER_ID,
          ORG_ID,
          'meeting-summarizer',
        ),
      );

      expect(marketplaceInstallsCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
        marketplace_type: 'skill',
        marketplace_slug: 'meeting-summarizer',
      });
    });
  });

  describe('handleMarketplaceIntegrationInstalled', () => {
    it('should increment marketplace installs counter with type "integration" and slug', () => {
      listener.handleMarketplaceIntegrationInstalled(
        new MarketplaceIntegrationInstalledEvent(
          USER_ID,
          ORG_ID,
          'oparl-council-data',
        ),
      );

      expect(marketplaceInstallsCounter.inc).toHaveBeenCalledWith({
        user_id: USER_ID,
        org_id: ORG_ID,
        marketplace_type: 'integration',
        marketplace_slug: 'oparl-council-data',
      });
    });
  });
});
