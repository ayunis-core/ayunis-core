import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { RunAnonymizationUnavailableError } from '../runs.errors';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import type { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { ToolResultCollectorService } from './tool-result-collector.service';
import { randomUUID } from 'crypto';

describe('ToolResultCollectorService', () => {
  let service: ToolResultCollectorService;
  let executeToolUseCase: jest.Mocked<ExecuteToolUseCase>;
  let checkToolCapabilitiesUseCase: jest.Mocked<CheckToolCapabilitiesUseCase>;
  let anonymizeTextUseCase: jest.Mocked<AnonymizeTextUseCase>;

  const orgId = randomUUID();
  const threadId = randomUUID();
  const toolUseId = randomUUID();

  beforeEach(() => {
    executeToolUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExecuteToolUseCase>;

    checkToolCapabilitiesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CheckToolCapabilitiesUseCase>;

    anonymizeTextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeTextUseCase>;

    service = new ToolResultCollectorService(
      executeToolUseCase,
      checkToolCapabilitiesUseCase,
      anonymizeTextUseCase,
    );
  });

  describe('anonymous mode tool result anonymization failure', () => {
    it('should throw RunAnonymizationUnavailableError when anonymize service is unavailable for PII-returning tool', async () => {
      const toolName = 'search_citizens_database';
      const tool = {
        name: toolName,
        type: 'search',
        returnsPii: true,
      } as unknown as Tool;

      const toolUseContent = Object.assign(
        Object.create(ToolUseMessageContent.prototype),
        { id: toolUseId, name: toolName, params: { query: 'Mustermann' } },
      );

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: false,
        isExecutable: true,
      });

      executeToolUseCase.execute.mockResolvedValue(
        'Max Mustermann, Hauptstraße 42, 80331 München, Tel: 089-12345678',
      );

      anonymizeTextUseCase.execute.mockRejectedValue(
        new AnonymizationFailedError('Connection refused'),
      );

      const thread = {
        id: threadId,
        getLastMessage: jest.fn().mockReturnValue({
          content: [toolUseContent],
        }),
      } as unknown as Thread;

      await expect(
        service.collectToolResults({
          thread,
          tools: [tool],
          input: null,
          orgId,
          isAnonymous: true,
        }),
      ).rejects.toThrow(RunAnonymizationUnavailableError);
    });

    it('should not anonymize tool results when anonymous mode is disabled', async () => {
      const toolName = 'search_citizens_database';
      const tool = {
        name: toolName,
        type: 'search',
        returnsPii: true,
      } as unknown as Tool;

      const toolUseContent = Object.assign(
        Object.create(ToolUseMessageContent.prototype),
        { id: toolUseId, name: toolName, params: { query: 'Mustermann' } },
      );

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: false,
        isExecutable: true,
      });

      const rawResult = 'Max Mustermann, Hauptstraße 42, 80331 München';
      executeToolUseCase.execute.mockResolvedValue(rawResult);

      const thread = {
        id: threadId,
        getLastMessage: jest.fn().mockReturnValue({
          content: [toolUseContent],
        }),
      } as unknown as Thread;

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(ToolResultMessageContent);
      expect(results[0].result).toBe(rawResult);
      expect(anonymizeTextUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
