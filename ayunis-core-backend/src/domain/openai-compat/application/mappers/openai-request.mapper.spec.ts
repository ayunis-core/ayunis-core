import { randomUUID } from 'crypto';
import { OpenAIRequestMapper } from './openai-request.mapper';
import { OpenAIInvalidRequestError } from '../openai-compat.errors';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import type { OpenAIChatCompletionRequest } from '../types/openai-request.types';

describe('OpenAIRequestMapper', () => {
  const mapper = new OpenAIRequestMapper();
  const threadId = randomUUID();

  describe('array-of-parts content', () => {
    it('folds text parts into a single string for user messages', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Hello, ' },
              { type: 'text', text: 'world!' },
            ],
          },
        ],
      };

      const { messages } = mapper.toDomainMessages(request, threadId);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toBeInstanceOf(UserMessage);
      const content = messages[0].content[0];
      expect(content).toBeInstanceOf(TextMessageContent);
      expect((content as TextMessageContent).text).toBe('Hello, world!');
    });

    it('accepts array-of-parts on system messages', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: 'You are helpful.' }],
          },
          { role: 'user', content: 'Hi' },
        ],
      };

      const { systemPrompt } = mapper.toDomainMessages(request, threadId);

      expect(systemPrompt).toBe('You are helpful.');
    });

    it('accepts array-of-parts on tool result messages', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'lookup', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_1',
            content: [{ type: 'text', text: 'result-body' }],
          },
        ],
      };

      const { messages } = mapper.toDomainMessages(request, threadId);

      const toolResult = messages[1];
      expect(toolResult).toBeInstanceOf(ToolResultMessage);
      const part = toolResult.content[0] as ToolResultMessageContent;
      expect(part.result).toBe('result-body');
    });

    it('rejects non-text parts with a descriptive error', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Look at this:' },
              {
                type: 'image_url',
                image_url: { url: 'https://example.com/cat.png' },
              },
            ],
          },
        ],
      };

      expect(() => mapper.toDomainMessages(request, threadId)).toThrow(
        OpenAIInvalidRequestError,
      );
      expect(() => mapper.toDomainMessages(request, threadId)).toThrow(
        /image_url/,
      );
    });
  });

  describe("role: 'developer'", () => {
    it("folds 'developer' messages into the system prompt", () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'o1-mini',
        messages: [
          { role: 'developer', content: 'Reason step by step.' },
          { role: 'user', content: 'What is 2+2?' },
        ],
      };

      const { systemPrompt, messages } = mapper.toDomainMessages(
        request,
        threadId,
      );

      expect(systemPrompt).toBe('Reason step by step.');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBeInstanceOf(UserMessage);
    });

    it("concatenates 'system' and 'developer' prompts in order", () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'o1-mini',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'developer', content: 'Use chain-of-thought.' },
          { role: 'user', content: 'Hi' },
        ],
      };

      const { systemPrompt } = mapper.toDomainMessages(request, threadId);

      expect(systemPrompt).toBe('You are helpful.\n\nUse chain-of-thought.');
    });
  });

  describe('lenient empty content', () => {
    it('accepts an empty-string user message', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: '' }],
      };

      const { messages } = mapper.toDomainMessages(request, threadId);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toBeInstanceOf(UserMessage);
      expect((messages[0].content[0] as TextMessageContent).text).toBe('');
    });

    it('accepts an assistant placeholder with no text and no tool_calls', () => {
      const request: OpenAIChatCompletionRequest = {
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: null },
          { role: 'user', content: 'Are you there?' },
        ],
      };

      const { messages } = mapper.toDomainMessages(request, threadId);

      expect(messages).toHaveLength(3);
      expect(messages[1]).toBeInstanceOf(AssistantMessage);
      const block = messages[1].content[0] as TextMessageContent;
      expect(block).toBeInstanceOf(TextMessageContent);
      expect(block.text).toBe('');
    });
  });
});
