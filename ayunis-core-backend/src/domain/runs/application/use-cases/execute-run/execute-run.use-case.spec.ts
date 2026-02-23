import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { RunAnonymizationUnavailableError } from '../../runs.errors';
import type { ContextService } from 'src/common/context/services/context.service';
import type { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import type { CreateAssistantMessageUseCase } from 'src/domain/messages/application/use-cases/create-assistant-message/create-assistant-message.use-case';
import type { CreateToolResultMessageUseCase } from 'src/domain/messages/application/use-cases/create-tool-result-message/create-tool-result-message.use-case';
import type { CreateUserMessageUseCase } from 'src/domain/messages/application/use-cases/create-user-message/create-user-message.use-case';
import type { TrimMessagesForContextUseCase } from 'src/domain/messages/application/use-cases/trim-messages-for-context/trim-messages-for-context.use-case';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { AddMessageToThreadUseCase } from 'src/domain/threads/application/use-cases/add-message-to-thread/add-message-to-thread.use-case';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { ExecuteRunUseCase } from './execute-run.use-case';
import { ExecuteRunCommand } from './execute-run.command';
import { RunUserInput } from '../../../domain/run-input.entity';
import type { CollectUsageAsyncService } from '../../services/collect-usage-async.service';
import type { ToolAssemblyService } from '../../services/tool-assembly.service';
import type { ToolResultCollectorService } from '../../services/tool-result-collector.service';
import type { MessageCleanupService } from '../../services/message-cleanup.service';
import type { StreamingInferenceService } from '../../services/streaming-inference.service';
import type { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { randomUUID } from 'crypto';

describe('ExecuteRunUseCase', () => {
  let useCase: ExecuteRunUseCase;
  let anonymizeTextUseCase: jest.Mocked<AnonymizeTextUseCase>;
  let findThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let toolAssemblyService: jest.Mocked<ToolAssemblyService>;
  let messageCleanupService: jest.Mocked<MessageCleanupService>;

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
      { execute: jest.fn() } as unknown as CreateAssistantMessageUseCase,
      { execute: jest.fn() } as unknown as CreateToolResultMessageUseCase,
      { execute: jest.fn() } as unknown as GetInferenceUseCase,
      findThreadUseCase,
      { execute: jest.fn() } as unknown as FindOneAgentUseCase,
      { execute: jest.fn() } as unknown as AddMessageToThreadUseCase,
      contextService,
      anonymizeTextUseCase,
      { collect: jest.fn() } as unknown as CollectUsageAsyncService,
      { execute: jest.fn() } as unknown as TrimMessagesForContextUseCase,
      toolAssemblyService,
      {
        collectToolResults: jest.fn().mockResolvedValue([]),
        exitLoopAfterAgentResponse: jest.fn().mockReturnValue(true),
      } as unknown as ToolResultCollectorService,
      messageCleanupService,
      {
        executeStreamingInference: jest.fn(),
      } as unknown as StreamingInferenceService,
      {
        activateOnThread: jest.fn(),
      } as unknown as jest.Mocked<SkillActivationService>,
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

      const streamingInferenceService = (
        useCase as unknown as {
          streamingInferenceService: jest.Mocked<StreamingInferenceService>;
        }
      ).streamingInferenceService;
      const assistantMessage = {
        id: randomUUID(),
        content: [{ type: 'text', text: 'Response' }],
      } as unknown as AssistantMessage;

      streamingInferenceService.executeStreamingInference.mockReturnValue(
        (async function* () {
          yield assistantMessage;
        })(),
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
      expect(
        streamingInferenceService.executeStreamingInference,
      ).toHaveBeenCalledWith(
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

      const streamingInferenceService = (
        useCase as unknown as {
          streamingInferenceService: jest.Mocked<StreamingInferenceService>;
        }
      ).streamingInferenceService;

      // First inference: assistant calls activate_skill tool
      const toolCallMessage = {
        id: randomUUID(),
        content: [
          {
            type: 'tool_use',
            toolId: 'tool-1',
            toolName: ToolType.ACTIVATE_SKILL,
            input: { skill_name: 'Another Skill' },
          },
        ],
      } as unknown as AssistantMessage;

      // Second inference: assistant responds normally
      const finalMessage = {
        id: randomUUID(),
        content: [{ type: 'text', text: 'Final response' }],
      } as unknown as AssistantMessage;

      let inferenceCallCount = 0;
      streamingInferenceService.executeStreamingInference.mockImplementation(
        () => {
          inferenceCallCount++;
          if (inferenceCallCount === 1) {
            return (async function* () {
              yield toolCallMessage;
            })();
          }
          return (async function* () {
            yield finalMessage;
          })();
        },
      );

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
        streamingInferenceService.executeStreamingInference.mock.calls[1];
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
});
