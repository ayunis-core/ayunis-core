import type {
  AssistantMessage as InferenceAssistantMessage,
  Message as InferenceMessage,
} from '@ayunis/inference';
import type { Tool as RuntimeTool } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import {
  toBackendAssistantMessage,
  toBackendToolResultMessage,
} from './inference-message.mapper';
import { RuntimeToolIntegrationRegistry } from './runtime-tool-integration.registry';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
const fixedId = '223e4567-e89b-12d3-a456-426614174000' as UUID;

describe('inference-message.mapper', () => {
  describe('toBackendAssistantMessage', () => {
    it('maps text, thinking and tool_use content preserving metadata', () => {
      const message: InferenceAssistantMessage = {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'hmm', id: 't1', signature: 'sig' },
          { type: 'text', text: 'hello', providerMetadata: { a: 1 } },
          {
            type: 'tool_use',
            id: 'call_1',
            name: 'get_weather',
            input: { city: 'Berlin' },
            providerMetadata: { b: 2 },
          },
        ],
      };

      const result = toBackendAssistantMessage(message, threadId, fixedId);

      expect(result.id).toBe(fixedId);
      expect(result.threadId).toBe(threadId);
      expect(result.content).toHaveLength(3);

      const [thinking, text, toolUse] = result.content;
      expect(thinking).toBeInstanceOf(ThinkingMessageContent);
      expect((thinking as ThinkingMessageContent).thinking).toBe('hmm');
      expect((thinking as ThinkingMessageContent).id).toBe('t1');
      expect((thinking as ThinkingMessageContent).signature).toBe('sig');

      expect(text).toBeInstanceOf(TextMessageContent);
      expect((text as TextMessageContent).text).toBe('hello');
      expect((text as TextMessageContent).providerMetadata).toEqual({ a: 1 });

      expect(toolUse).toBeInstanceOf(ToolUseMessageContent);
      expect((toolUse as ToolUseMessageContent).id).toBe('call_1');
      expect((toolUse as ToolUseMessageContent).name).toBe('get_weather');
      expect((toolUse as ToolUseMessageContent).params).toEqual({
        city: 'Berlin',
      });
      expect((toolUse as ToolUseMessageContent).providerMetadata).toEqual({
        b: 2,
      });
    });

    it('drops non-assistant content types (e.g. images)', () => {
      const message: InferenceAssistantMessage = {
        role: 'assistant',
        content: [
          { type: 'image', data: 'base64', mediaType: 'image/png' },
          { type: 'text', text: 'ok' },
        ],
      };

      const result = toBackendAssistantMessage(message, threadId, fixedId);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe(MessageContentType.TEXT);
    });
  });

  describe('calls awaiting confirmation', () => {
    const MCP_TOOL = 'mcp__tool__create_ticket__423e4567';
    const runtimeTools: RuntimeTool[] = [
      {
        name: MCP_TOOL,
        description: 'Creates a ticket',
        parameters: { type: 'object' },
        needsApproval: true,
        validateInput: (input) => {
          if (typeof input.title !== 'string') throw new Error('title');
        },
        execute: () => 'created',
      },
      {
        name: 'internet_search',
        description: 'Searches the web',
        parameters: { type: 'object' },
        execute: () => 'results',
      },
    ];
    const registry = new RuntimeToolIntegrationRegistry([], runtimeTools);
    const turn = (
      ticketInput: Record<string, unknown>,
    ): InferenceAssistantMessage => ({
      role: 'assistant',
      content: [
        { type: 'tool_use', id: 'call_1', name: MCP_TOOL, input: ticketInput },
        {
          type: 'tool_use',
          id: 'call_2',
          name: 'internet_search',
          input: { query: 'Laterne' },
        },
      ],
    });
    const marks = (message: InferenceAssistantMessage) =>
      toBackendAssistantMessage(
        message,
        threadId,
        fixedId,
        registry,
      ).content.map(
        (content) => (content as ToolUseMessageContent).requiresConfirmation,
      );

    it('marks only the calls needing approval of a turn that ends the run for confirmation', () => {
      expect(marks(turn({ title: 'Laterne defekt' }))).toEqual([true, false]);
    });

    it('marks no call of a turn whose invalid input goes back to the model', () => {
      expect(marks(turn({}))).toEqual([false, false]);
    });
  });

  describe('toBackendToolResultMessage', () => {
    it('maps only tool_result content', () => {
      const message: InferenceMessage = {
        role: 'tool_result',
        content: [
          {
            type: 'tool_result',
            toolCallId: 'call_1',
            toolName: 'get_weather',
            result: 'sunny',
          },
          { type: 'text', text: 'ignored' },
        ],
      };

      const result = toBackendToolResultMessage(message, threadId, fixedId);

      expect(result.content).toHaveLength(1);
      const [content] = result.content;
      expect(content).toBeInstanceOf(ToolResultMessageContent);
      expect(content.toolId).toBe('call_1');
      expect(content.toolName).toBe('get_weather');
      expect(content.result).toBe('sunny');
    });
  });
});
