import type {
  AssistantMessage as InferenceAssistantMessage,
  Message as InferenceMessage,
} from '@ayunis/inference';
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
