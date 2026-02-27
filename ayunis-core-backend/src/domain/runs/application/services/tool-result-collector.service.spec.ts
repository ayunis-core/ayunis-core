import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { RunAnonymizationUnavailableError } from '../runs.errors';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import type { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultCollectorService } from './tool-result-collector.service';
import { randomUUID } from 'crypto';
import type { JSONSchema } from 'json-schema-to-ts';

// --- Helpers ---

class MockTool extends Tool {
  constructor(name: string, type: ToolType) {
    super({
      name,
      description: 'mock',
      parameters: {} as JSONSchema,
      type,
    });
  }
  validateParams(params: Record<string, any>): any {
    return params;
  }
  get returnsPii(): boolean {
    return false;
  }
}

function makeToolUseContent(
  id: string,
  name: string,
  params: Record<string, any> = {},
): ToolUseMessageContent {
  return Object.assign(Object.create(ToolUseMessageContent.prototype), {
    id,
    name,
    params,
    type: MessageContentType.TOOL_USE,
  });
}

function makeThread(toolUseContents: ToolUseMessageContent[]): Thread {
  const msg = {
    content: toolUseContents,
  } as AssistantMessage;
  return {
    id: randomUUID(),
    getLastMessage: () => msg,
  } as unknown as Thread;
}

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
      execute: jest.fn().mockResolvedValue('executed'),
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

  describe('collectToolResults — hybrid tools', () => {
    it('should call handleDisplayableTool and NOT executeBackendTool for displayable-only tool', async () => {
      const tool = new MockTool('send_email', ToolType.SEND_EMAIL);
      const toolUse = makeToolUseContent('tu-1', 'send_email');
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].result).toBe('Tool has been displayed successfully');
      expect(executeToolUseCase.execute).not.toHaveBeenCalled();
    });

    it('should call executeBackendTool and NOT handleDisplayableTool for executable-only tool', async () => {
      const tool = new MockTool('http_tool', ToolType.HTTP);
      const toolUse = makeToolUseContent('tu-2', 'http_tool', { url: 'x' });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: false,
        isExecutable: true,
      });

      executeToolUseCase.execute.mockResolvedValue('backend result');

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].result).toBe('backend result');
      expect(executeToolUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should call executeBackendTool first then return displayable result for hybrid tool', async () => {
      const tool = new MockTool('create_document', ToolType.CREATE_DOCUMENT);
      const toolUse = makeToolUseContent('tu-3', 'create_document', {
        title: 'Doc',
        content: '<p>hi</p>',
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: true,
      });

      executeToolUseCase.execute.mockResolvedValue('artifact created');

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      // Side effect: executeBackendTool was called
      expect(executeToolUseCase.execute).toHaveBeenCalledTimes(1);
      // But the result returned to LLM is the displayable result
      expect(results).toHaveLength(1);
      expect(results[0].result).toBe('Tool has been displayed successfully');
    });

    it('should return execution error to LLM when hybrid tool execution fails', async () => {
      const tool = new MockTool('create_document', ToolType.CREATE_DOCUMENT);
      const toolUse = makeToolUseContent('tu-5', 'create_document', {
        title: 'Doc',
        content: '<p>hi</p>',
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: true,
      });

      executeToolUseCase.execute.mockRejectedValue(
        new Error('DB constraint violation'),
      );

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0].result).toBe(
        "The tool didn't provide any result due to an unknown error",
      );
      expect(results[0].result).not.toBe(
        'Tool has been displayed successfully',
      );
    });
  });

  describe('exitLoopAfterAgentResponse', () => {
    it('should return false when response contains a hybrid displayable+executable tool', () => {
      const tool = new MockTool('create_document', ToolType.CREATE_DOCUMENT);
      const toolUseContent = makeToolUseContent('tu-4', 'create_document');

      const message = {
        content: [toolUseContent],
      } as unknown as AssistantMessage;

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: true,
      });

      const result = service.exitLoopAfterAgentResponse(message, [tool]);

      // Hybrid tools need backend execution, so the loop must continue
      expect(result).toBe(false);
    });

    it('should return true when response contains a display-only tool', () => {
      const tool = new MockTool('chart_tool', ToolType.ACTIVATE_SKILL);
      const toolUseContent = makeToolUseContent('tu-5', 'chart_tool');

      const message = {
        content: [toolUseContent],
      } as unknown as AssistantMessage;

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      const result = service.exitLoopAfterAgentResponse(message, [tool]);

      expect(result).toBe(true);
    });
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
