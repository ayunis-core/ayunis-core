import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { RunAnonymizationUnavailableError } from '../../runs.errors';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';

import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { ExecuteRunUseCase } from './execute-run.use-case';
import { ExecuteRunCommand } from './execute-run.command';
import { RunUserInput } from '../../../domain/run-input.entity';
import type { CreditBudgetGuardService } from '../../services/credit-budget-guard.service';
import type { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { RunErrorCode } from '../../runs.errors';
import type { Agent } from 'src/domain/agents/domain/agent.entity';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import type { MessageCleanupService } from '../../services/message-cleanup.service';
import type { InferenceOrchestratorService } from '../../services/inference-orchestrator.service';
import type { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { randomUUID } from 'crypto';

describe('ExecuteRunUseCase', () => {
  let useCase: ExecuteRunUseCase;
  let anonymizeTextUseCase: jest.Mocked<AnonymizeTextUseCase>;
  let findThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let findOneAgentUseCase: jest.Mocked<FindOneAgentUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let toolAssemblyService: jest.Mocked<ToolAssemblyService>;
  let messageCleanupService: jest.Mocked<MessageCleanupService>;
  let checkQuotaUseCase: jest.Mocked<CheckQuotaUseCase>;
  let creditBudgetGuardService: jest.Mocked<CreditBudgetGuardService>;

  const userId = randomUUID();
  const orgId = randomUUID();
  const threadId = randomUUID();

  function createMockThread(overrides: Partial<Thread> = {}): Thread {
    const model = {
      model: {
        name: 'gpt-4',
        canUseTools: true,
        canVision: false,
      } as LanguageModel,
      anonymousOnly: false,
    } as PermittedLanguageModel;

    return {
      id: threadId,
      userId,
      agentId: null,
      model,
      isAnonymous: false,
      messages: [],
      getLastMessage: jest.fn().mockReturnValue(null),
      ...overrides,
    } as unknown as Thread;
  }

  beforeEach(() => {
    anonymizeTextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeTextUseCase>;

    findThreadUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindThreadUseCase>;

    findOneAgentUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOneAgentUseCase>;

    checkQuotaUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CheckQuotaUseCase>;

    creditBudgetGuardService = {
      ensureBudgetAvailable: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditBudgetGuardService>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    toolAssemblyService = {
      findActiveSkills: jest.fn().mockResolvedValue([]),
      buildRunContext: jest.fn().mockResolvedValue({
        tools: [],
        instructions: 'Du bist ein hilfreicher Assistent der Stadtverwaltung',
      }),
    } as unknown as jest.Mocked<ToolAssemblyService>;

    messageCleanupService = {
      cleanupTrailingNonAssistantMessages: jest
        .fn()
        .mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageCleanupService>;

    contextService.get.mockImplementation((key?: string | symbol) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      return undefined;
    });

    useCase = new ExecuteRunUseCase(
      { execute: jest.fn() } as unknown as CreateUserMessageUseCase,
      { execute: jest.fn() } as unknown as CreateToolResultMessageUseCase,
      findThreadUseCase,
      findOneAgentUseCase,
      { execute: jest.fn() } as unknown as AddMessageToThreadUseCase,
      contextService,
      anonymizeTextUseCase,
      checkQuotaUseCase,
      creditBudgetGuardService,
      toolAssemblyService,
      {
        collectToolResults: jest.fn().mockResolvedValue([]),
        exitLoopAfterAgentResponse: jest.fn().mockReturnValue(true),
      } as unknown as ToolResultCollectorService,
      messageCleanupService,
      {
        runInference: jest.fn(),
      } as unknown as InferenceOrchestratorService,
      {
        activateOnThread: jest.fn(),
      } as unknown as jest.Mocked<SkillActivationService>,
      {
        emitAsync: jest.fn().mockResolvedValue([]),
      } as unknown as EventEmitter2,
    );
  });

  describe('skill activation via quick action', () => {
    it('should append already-activated note to instructions when skillId is provided', async () => {
      const skillId = randomUUID();
      const thread = createMockThread();
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });

      const skillActivationService = (
        useCase as unknown as {
          skillActivationService: jest.Mocked<SkillActivationService>;
        }
      ).skillActivationService;
      skillActivationService.activateOnThread.mockResolvedValue({
        instructions: 'Analyze the legal question.',
        skillName: 'Legal Research',
      });

      const inferenceOrchestratorService = (
        useCase as unknown as {
          inferenceOrchestratorService: jest.Mocked<InferenceOrchestratorService>;
        }
      ).inferenceOrchestratorService;
      const assistantMessage = {
        id: randomUUID(),
        content: [{ type: 'text', text: 'Response' }],
      } as unknown as AssistantMessage;

      inferenceOrchestratorService.runInference.mockReturnValue(
        (async function* () {
          yield assistantMessage;
          return assistantMessage;
        })() as AsyncGenerator<Message, AssistantMessage, void>,
      );

      const toolResultCollectorService = (
        useCase as unknown as {
          toolResultCollectorService: jest.Mocked<ToolResultCollectorService>;
        }
      ).toolResultCollectorService;
      toolResultCollectorService.exitLoopAfterAgentResponse.mockReturnValue(
        true,
      );

      const input = new RunUserInput('Hilfe bei Rechtsrecherche', [], skillId);
      const command = new ExecuteRunCommand({
        threadId,
        input,
        streaming: true,
      });

      const generator = await useCase.execute(command);
      // Drain the generator to completion
      let drainResult = await generator.next();
      while (!drainResult.done) {
        drainResult = await generator.next();
      }

      // Verify the streaming inference was called with instructions containing the note
      expect(inferenceOrchestratorService.runInference).toHaveBeenCalledWith(
        expect.objectContaining({
          instructions: expect.stringContaining(
            'Skill "Legal Research" has already been activated on this thread. Do not call activate_skill for this skill.',
          ),
        }),
      );
    });

    it('should preserve already-activated note after a subsequent refreshRunContext triggered by AI-initiated activate_skill', async () => {
      const skillId = randomUUID();
      const thread = createMockThread();
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });

      const skillActivationService = (
        useCase as unknown as {
          skillActivationService: jest.Mocked<SkillActivationService>;
        }
      ).skillActivationService;
      skillActivationService.activateOnThread.mockResolvedValue({
        instructions: 'Analyze the legal question.',
        skillName: 'Legal Research',
      });

      const inferenceOrchestratorService = (
        useCase as unknown as {
          inferenceOrchestratorService: jest.Mocked<InferenceOrchestratorService>;
        }
      ).inferenceOrchestratorService;

      // First inference: assistant calls activate_skill tool
      const toolCallMessage = {
        id: randomUUID(),
        content: [
          {
            type: 'tool_use',
            toolId: 'tool-1',
            toolName: ToolType.ACTIVATE_SKILL,
            input: { skill_slug: 'Another Skill' },
          },
        ],
      } as unknown as AssistantMessage;

      // Second inference: assistant responds normally
      const finalMessage = {
        id: randomUUID(),
        content: [{ type: 'text', text: 'Final response' }],
      } as unknown as AssistantMessage;

      let inferenceCallCount = 0;
      inferenceOrchestratorService.runInference.mockImplementation(() => {
        inferenceCallCount++;
        if (inferenceCallCount === 1) {
          return (async function* () {
            yield toolCallMessage;
            return toolCallMessage;
          })() as AsyncGenerator<Message, AssistantMessage, void>;
        }
        return (async function* () {
          yield finalMessage;
          return finalMessage;
        })() as AsyncGenerator<Message, AssistantMessage, void>;
      });

      const toolResultCollectorService = (
        useCase as unknown as {
          toolResultCollectorService: jest.Mocked<ToolResultCollectorService>;
        }
      ).toolResultCollectorService;

      let collectCallCount = 0;
      toolResultCollectorService.collectToolResults.mockImplementation(
        async () => {
          collectCallCount++;
          if (collectCallCount === 1) {
            // First call: no pending results (initial processToolResults)
            return [];
          }
          // Second call: activate_skill tool result
          return [
            new ToolResultMessageContent(
              'tool-1',
              ToolType.ACTIVATE_SKILL,
              'Skill activated successfully',
            ),
          ];
        },
      );

      // First call: don't exit (tool call); second call: exit
      let exitCallCount = 0;
      toolResultCollectorService.exitLoopAfterAgentResponse.mockImplementation(
        () => {
          exitCallCount++;
          return exitCallCount > 1;
        },
      );

      const input = new RunUserInput('Hilfe bei Rechtsrecherche', [], skillId);
      const command = new ExecuteRunCommand({
        threadId,
        input,
        streaming: true,
      });

      const generator = await useCase.execute(command);
      let drainResult = await generator.next();
      while (!drainResult.done) {
        drainResult = await generator.next();
      }

      // The second inference call must still contain the note
      // (after refreshRunContext was called again in processToolResults)
      const secondCall =
        inferenceOrchestratorService.runInference.mock.calls[1];
      expect(secondCall).toBeDefined();
      const secondCallParams = secondCall[0] as { instructions?: string };
      expect(secondCallParams.instructions).toContain(
        'Skill "Legal Research" has already been activated on this thread. Do not call activate_skill for this skill.',
      );
    });
  });

  describe('anonymous mode anonymization failure', () => {
    it('should throw RunAnonymizationUnavailableError when anonymize service is unavailable and thread is anonymous', async () => {
      const thread = createMockThread({ isAnonymous: true });
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      anonymizeTextUseCase.execute.mockRejectedValue(
        new AnonymizationFailedError('Connection refused'),
      );

      const input = new RunUserInput(
        'Mein Name ist Max Mustermann und ich wohne in München',
        [],
      );
      const command = new ExecuteRunCommand({
        threadId,
        input,
        streaming: false,
      });

      const generator = await useCase.execute(command);
      await expect(generator.next()).rejects.toThrow(
        RunAnonymizationUnavailableError,
      );
    });

    it('should throw RunAnonymizationUnavailableError when anonymize service fails for model-enforced anonymous mode', async () => {
      const model = {
        model: {
          name: 'gpt-4',
          canUseTools: true,
          canVision: false,
        } as LanguageModel,
        anonymousOnly: true,
      } as PermittedLanguageModel;
      const thread = createMockThread({ isAnonymous: false, model });
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      anonymizeTextUseCase.execute.mockRejectedValue(
        new AnonymizationFailedError('Service timeout'),
      );

      const input = new RunUserInput(
        'Kontaktieren Sie mich unter max@example.de',
        [],
      );
      const command = new ExecuteRunCommand({
        threadId,
        input,
        streaming: false,
      });

      const generator = await useCase.execute(command);
      await expect(generator.next()).rejects.toThrow(
        RunAnonymizationUnavailableError,
      );
    });
  });

  describe('tier-aware fair-use quota selection', () => {
    function makeTieredModel(
      tier: ModelTier | undefined,
    ): PermittedLanguageModel {
      return {
        model: {
          name: 'gpt-tier',
          canUseTools: false,
          canVision: false,
          tier,
        } as unknown as LanguageModel,
        anonymousOnly: false,
      } as PermittedLanguageModel;
    }

    function stubInferenceWithEmptyResponse() {
      const inferenceOrchestratorService = (
        useCase as unknown as {
          inferenceOrchestratorService: jest.Mocked<InferenceOrchestratorService>;
        }
      ).inferenceOrchestratorService;
      const assistantMessage = {
        id: randomUUID(),
        content: [{ type: 'text', text: 'ok' }],
      } as unknown as AssistantMessage;
      inferenceOrchestratorService.runInference.mockReturnValue(
        (async function* () {
          yield assistantMessage;
          return assistantMessage;
        })() as AsyncGenerator<Message, AssistantMessage, void>,
      );
    }

    async function drainGenerator(
      generator: AsyncGenerator<unknown, void, void>,
    ): Promise<void> {
      let result = await generator.next();
      while (!result.done) {
        result = await generator.next();
      }
    }

    it.each([
      [ModelTier.LOW, QuotaType.FAIR_USE_MESSAGES_LOW],
      [ModelTier.MEDIUM, QuotaType.FAIR_USE_MESSAGES_MEDIUM],
      [ModelTier.HIGH, QuotaType.FAIR_USE_MESSAGES_HIGH],
    ])(
      'routes a thread on a %s-tier model to %s',
      async (tier, expectedQuotaType) => {
        const thread = createMockThread({ model: makeTieredModel(tier) });
        findThreadUseCase.execute.mockResolvedValue({
          thread,
          isLongChat: false,
        });
        stubInferenceWithEmptyResponse();

        const command = new ExecuteRunCommand({
          threadId,
          input: new RunUserInput('hello', []),
          streaming: true,
        });
        await drainGenerator(await useCase.execute(command));

        expect(checkQuotaUseCase.execute).toHaveBeenCalledTimes(1);
        const query = checkQuotaUseCase.execute.mock.calls[0][0];
        expect(query.userId).toBe(userId);
        expect(query.quotaType).toBe(expectedQuotaType);
        expect(
          creditBudgetGuardService.ensureBudgetAvailable,
        ).toHaveBeenCalledWith(orgId);
      },
    );

    it('falls back to FAIR_USE_MESSAGES_MEDIUM when the model has no tier', async () => {
      const thread = createMockThread({ model: makeTieredModel(undefined) });
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      stubInferenceWithEmptyResponse();

      const command = new ExecuteRunCommand({
        threadId,
        input: new RunUserInput('hello', []),
        streaming: true,
      });
      await drainGenerator(await useCase.execute(command));

      expect(checkQuotaUseCase.execute).toHaveBeenCalledTimes(1);
      expect(checkQuotaUseCase.execute.mock.calls[0][0].quotaType).toBe(
        QuotaType.FAIR_USE_MESSAGES_MEDIUM,
      );
    });

    it('uses the agent model tier when the thread is agent-backed', async () => {
      const agentId = randomUUID();
      const thread = createMockThread({
        agentId,
        // Thread carries no model of its own — must fall through to the
        // agent's model.
        model: undefined as unknown as PermittedLanguageModel,
      });
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      findOneAgentUseCase.execute.mockResolvedValue({
        agent: {
          id: agentId,
          model: makeTieredModel(ModelTier.HIGH),
        } as unknown as Agent,
        isShared: false,
      });
      stubInferenceWithEmptyResponse();

      const command = new ExecuteRunCommand({
        threadId,
        input: new RunUserInput('hello', []),
        streaming: true,
      });
      await drainGenerator(await useCase.execute(command));

      expect(findOneAgentUseCase.execute).toHaveBeenCalledTimes(1);
      expect(checkQuotaUseCase.execute.mock.calls[0][0].quotaType).toBe(
        QuotaType.FAIR_USE_MESSAGES_HIGH,
      );
    });

    it('does NOT charge a quota when no model can be resolved', async () => {
      const thread = createMockThread({
        model: undefined as unknown as PermittedLanguageModel,
      });
      findThreadUseCase.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });

      const command = new ExecuteRunCommand({
        threadId,
        input: new RunUserInput('hello', []),
        streaming: true,
      });

      // `pickModel` throws synchronously — the outer try in `execute()`
      // wraps it in `RunNoModelFoundError` (an `ApplicationError`) which is
      // re-thrown unchanged. The wrapper turns it into a RunErrorEvent.
      await expect(useCase.execute(command)).rejects.toMatchObject({
        code: RunErrorCode.RUN_NO_MODEL_FOUND,
      });
      expect(checkQuotaUseCase.execute).not.toHaveBeenCalled();
      expect(
        creditBudgetGuardService.ensureBudgetAvailable,
      ).not.toHaveBeenCalled();
    });
  });
});
