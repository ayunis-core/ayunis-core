import { Test, TestingModule } from '@nestjs/testing';
import { ToolResultCollectorService } from './tool-result-collector.service';
import { ExecuteToolUseCase } from 'src/domain/tools/application/use-cases/execute-tool/execute-tool.use-case';
import {
  CheckToolCapabilitiesUseCase,
  ToolCapabilities,
} from 'src/domain/tools/application/use-cases/check-tool-capabilities/check-tool-capabilities.use-case';
import { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { JSONSchema } from 'json-schema-to-ts';
import { randomUUID } from 'crypto';

// --- Mocks ---

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

function makeMockTrace(): any {
  const span = { update: jest.fn(), end: jest.fn() };
  return { span: jest.fn().mockReturnValue(span) };
}

describe('ToolResultCollectorService', () => {
  let service: ToolResultCollectorService;
  let executeToolUseCase: jest.Mocked<ExecuteToolUseCase>;
  let checkToolCapabilitiesUseCase: jest.Mocked<CheckToolCapabilitiesUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolResultCollectorService,
        {
          provide: ExecuteToolUseCase,
          useValue: { execute: jest.fn().mockResolvedValue('executed') },
        },
        {
          provide: CheckToolCapabilitiesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AnonymizeTextUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ToolResultCollectorService);
    executeToolUseCase = module.get(ExecuteToolUseCase);
    checkToolCapabilitiesUseCase = module.get(CheckToolCapabilitiesUseCase);
  });

  describe('collectToolResults', () => {
    const orgId = randomUUID();

    it('should call handleDisplayableTool and NOT executeBackendTool for displayable-only tool', async () => {
      const tool = new MockTool('send_email', ToolType.SEND_EMAIL);
      const toolUse = makeToolUseContent('tu-1', 'send_email');
      const thread = makeThread([toolUse]);

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: false,
      } as ToolCapabilities);

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        trace: makeMockTrace(),
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
      } as ToolCapabilities);

      executeToolUseCase.execute.mockResolvedValue('backend result');

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        trace: makeMockTrace(),
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
      } as ToolCapabilities);

      executeToolUseCase.execute.mockResolvedValue('artifact created');

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        trace: makeMockTrace(),
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
      } as ToolCapabilities);

      executeToolUseCase.execute.mockRejectedValue(
        new Error('DB constraint violation'),
      );

      const results = await service.collectToolResults({
        thread,
        tools: [tool],
        input: null,
        trace: makeMockTrace(),
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
    it('should return true when response contains a hybrid displayable+executable tool', () => {
      const tool = new MockTool('create_document', ToolType.CREATE_DOCUMENT);
      const toolUseContent = makeToolUseContent('tu-4', 'create_document');

      const message = {
        content: [toolUseContent],
      } as unknown as AssistantMessage;

      checkToolCapabilitiesUseCase.execute.mockReturnValue({
        isDisplayable: true,
        isExecutable: true,
      } as ToolCapabilities);

      const result = service.exitLoopAfterAgentResponse(message, [tool]);

      expect(result).toBe(true);
    });
  });
});
