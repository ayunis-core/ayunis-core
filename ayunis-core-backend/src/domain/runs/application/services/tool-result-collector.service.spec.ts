import { AnonymizationFailedError } from 'src/common/anonymization/application/anonymization.errors';
import type { AnonymizeTextForThreadUseCase } from 'src/domain/thread-pii-masks/application/use-cases/anonymize-text-for-thread/anonymize-text-for-thread.use-case';
import { RunAnonymizationUnavailableError } from '../runs.errors';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import type { CheckToolCapabilitiesUseCase } from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultCollectorService } from './tool-result-collector.service';
import { randomUUID } from 'crypto';
import { ToolUsedEvent } from '../events/tool-used.event';

// --- Helpers ---

class MockTool extends Tool {
  constructor(name: string, type: ToolType) {
    super({
      name,
      description: 'mock',
      parameters: {},
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
  integration?: { id: string; name: string; logoUrl: string | null },
): ToolUseMessageContent {
  return Object.assign(Object.create(ToolUseMessageContent.prototype), {
    id,
    name,
    params,
    integration,
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
  let anonymizeTextForThreadUseCase: jest.Mocked<AnonymizeTextForThreadUseCase>;
  let contextService: jest.Mocked<ContextService>;
  let eventEmitter: { emitAsync: jest.Mock };

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

    anonymizeTextForThreadUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeTextForThreadUseCase>;

    contextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    } as unknown as jest.Mocked<ContextService>;

    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };

    service = new ToolResultCollectorService(
      executeToolUseCase,
      checkToolCapabilitiesUseCase,
      anonymizeTextForThreadUseCase,
      contextService,
      eventEmitter as never,
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

      const { contents: results } = await service.collectToolResults({
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

      const { contents: results } = await service.collectToolResults({
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

    it('should include MCP integration identity in tool usage events', async () => {
      const userId = randomUUID();
      const integrationId = randomUUID();
      const tool = new MockTool('search_council_sessions', ToolType.MCP_TOOL);
      const toolUse = makeToolUseContent(
        'tu-mcp',
        'search_council_sessions',
        {},
        {
          id: integrationId,
          name: 'Council Data',
          logoUrl: null,
        },
      );
      contextService.get.mockReturnValue(userId);
      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: false,
        isExecutable: true,
      });

      await service.collectToolResults({
        thread: makeThread([toolUse]),
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        ToolUsedEvent.EVENT_NAME,
        expect.objectContaining({
          userId,
          orgId,
          toolName: 'search_council_sessions',
          integrationId,
          integrationName: 'Council Data',
        }),
      );
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

      const { contents: results } = await service.collectToolResults({
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

      const { contents: results } = await service.collectToolResults({
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

  describe('display-only param validation (AYC-675)', () => {
    class InvalidParamsTool extends MockTool {
      validateParams(): never {
        throw new Error(
          "Invalid parameters: parameter 'start' must be a valid ISO 8601 date-time",
        );
      }
    }

    it('should return an error result and succeeded=false when display-only params are invalid', async () => {
      const tool = new InvalidParamsTool(
        'create_calendar_event',
        ToolType.CREATE_CALENDAR_EVENT,
      );
      const toolUse = makeToolUseContent('tu-6', 'create_calendar_event', {
        start: 'not-a-date',
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      const { contents, outcomes } = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(contents).toHaveLength(1);
      expect(contents[0].result).toBe(
        "The tool didn't provide any result due to the following error in tool usage: Invalid parameters: parameter 'start' must be a valid ISO 8601 date-time",
      );
      expect(outcomes[0].succeeded).toBe(false);
      expect(executeToolUseCase.execute).not.toHaveBeenCalled();
    });

    it('should not re-validate hybrid tool params after a successful execution', async () => {
      // The handler already validated the null-stripped input; re-checking
      // the raw params could reject a call whose side effect just succeeded.
      const tool = new InvalidParamsTool(
        'create_document',
        ToolType.CREATE_DOCUMENT,
      );
      const toolUse = makeToolUseContent('tu-9', 'create_document', {
        letterhead_id: null,
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: true,
      });
      executeToolUseCase.execute.mockResolvedValue('artifact created');

      const { contents, outcomes } = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(contents[0].result).toBe('Tool has been displayed successfully');
      expect(outcomes[0].succeeded).toBe(true);
    });

    it('should strip disallowed nulls before validating display-only params', async () => {
      const tool = new MockTool('bar_chart', ToolType.BAR_CHART);
      tool.parameters = {
        type: 'object',
        properties: { insight: { type: 'string' } },
      } as never;
      const validateSpy = jest.spyOn(tool, 'validateParams');
      const toolUse = makeToolUseContent('tu-10', 'bar_chart', {
        insight: null,
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(validateSpy).toHaveBeenCalledWith({});
    });

    it('should pass a frontend-supplied result through without validating', async () => {
      const tool = new InvalidParamsTool(
        'create_calendar_event',
        ToolType.CREATE_CALENDAR_EVENT,
      );
      const toolUse = makeToolUseContent('tu-7', 'create_calendar_event', {
        start: 'not-a-date',
      });
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      const { contents, outcomes } = await service.collectToolResults({
        thread,
        tools: [tool],
        input: {
          toolId: 'tu-7',
          toolName: 'create_calendar_event',
          result: 'User downloaded the event',
        },
        orgId,
        isAnonymous: false,
      });

      expect(contents[0].result).toBe('User downloaded the event');
      expect(outcomes[0].succeeded).toBe(true);
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

    it('should return false when the display-only tool call has invalid params (AYC-675)', () => {
      const tool = new MockTool(
        'create_calendar_event',
        ToolType.CREATE_CALENDAR_EVENT,
      );
      jest.spyOn(tool, 'validateParams').mockImplementation(() => {
        throw new Error('Invalid parameters');
      });
      const toolUseContent = makeToolUseContent(
        'tu-8',
        'create_calendar_event',
      );

      const message = {
        content: [toolUseContent],
      } as unknown as AssistantMessage;

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      // The loop must continue so the model receives the validation error
      // and can retry with corrected params.
      const result = service.exitLoopAfterAgentResponse(message, [tool]);

      expect(result).toBe(false);
    });

    it('should return false when one of several display-only calls is invalid (AYC-675)', () => {
      const validTool = new MockTool('bar_chart', ToolType.BAR_CHART);
      const invalidTool = new MockTool(
        'create_calendar_event',
        ToolType.CREATE_CALENDAR_EVENT,
      );
      jest.spyOn(invalidTool, 'validateParams').mockImplementation(() => {
        throw new Error('Invalid parameters');
      });

      const message = {
        content: [
          makeToolUseContent('tu-9', 'bar_chart'),
          makeToolUseContent('tu-10', 'create_calendar_event'),
        ],
      } as unknown as AssistantMessage;

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      });

      // A valid sibling must not end the turn while an invalid display call
      // still needs a retry.
      const result = service.exitLoopAfterAgentResponse(message, [
        validTool,
        invalidTool,
      ]);

      expect(result).toBe(false);
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

      anonymizeTextForThreadUseCase.execute.mockRejectedValue(
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

    it('should return anonymized text and the mask dictionary for PII-returning tools', async () => {
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
        'Max Mustermann, Hauptstraße 42',
      );

      const mask = {
        token: '{{pii:PERSON_NAME_1}}',
        value: 'Max Mustermann',
        category: 'person_name',
      };
      anonymizeTextForThreadUseCase.execute.mockResolvedValue({
        originalText: 'Max Mustermann, Hauptstraße 42',
        anonymizedText: '{{pii:PERSON_NAME_1}}, {{pii:LOCATION_1}}',
        replacements: [],
        newMasks: [],
        masks: [mask],
      } as never);

      const thread = {
        id: threadId,
        getLastMessage: jest.fn().mockReturnValue({
          content: [toolUseContent],
        }),
      } as unknown as Thread;

      const { contents, piiMasks } = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: true,
      });

      expect(contents[0].result).toBe(
        '{{pii:PERSON_NAME_1}}, {{pii:LOCATION_1}}',
      );
      expect(piiMasks).toEqual([mask]);
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

      const { contents: results } = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        orgId,
        isAnonymous: false,
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(ToolResultMessageContent);
      expect(results[0].result).toBe(rawResult);
      expect(anonymizeTextForThreadUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
