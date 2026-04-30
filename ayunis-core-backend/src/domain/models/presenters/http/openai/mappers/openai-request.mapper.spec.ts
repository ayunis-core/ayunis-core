import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { OpenAIRequestMapper } from './openai-request.mapper';
import { ChatCompletionRequestDto } from '../dto/chat-completion-request.dto';
import { PermittedLanguageModel } from '../../../../domain/permitted-model.entity';
import { LanguageModel } from '../../../../domain/models/language.model';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { ModelToolChoice } from '../../../../domain/value-objects/model-tool-choice.enum';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';

describe('OpenAIRequestMapper', () => {
  const orgId = randomUUID();

  let mapper: OpenAIRequestMapper;

  const buildPermittedLanguageModel = (): PermittedLanguageModel =>
    new PermittedLanguageModel({
      model: new LanguageModel({
        name: 'gpt-4o',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4o',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: false,
        isArchived: false,
      }),
      orgId,
    });

  const buildRequest = (
    overrides: Partial<ChatCompletionRequestDto> = {},
  ): ChatCompletionRequestDto => {
    const dto = new ChatCompletionRequestDto();
    dto.model = 'gpt-4o';
    dto.messages = [];
    Object.assign(dto, overrides);
    return dto;
  };

  beforeEach(() => {
    mapper = new OpenAIRequestMapper();
  });

  describe('toGetInferenceCommand', () => {
    it('produces a command with a single user message and AUTO tool choice for a simple user prompt', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: 'hello' }],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.messages).toHaveLength(1);
      expect(cmd.messages[0]).toBeInstanceOf(UserMessage);
      const content = cmd.messages[0].content[0];
      expect(content).toBeInstanceOf(TextMessageContent);
      expect((content as TextMessageContent).text).toBe('hello');
      expect(cmd.tools).toEqual([]);
      expect(cmd.toolChoice).toBe(ModelToolChoice.AUTO);
      expect(cmd.instructions).toBeUndefined();
    });

    it('maps `tools` from the request body into the command `tools` field', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get the weather',
              parameters: {
                type: 'object',
                properties: { city: { type: 'string' } },
                required: ['city'],
              },
            },
          },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.tools).toHaveLength(1);
      expect(cmd.tools[0]).toEqual({
        name: 'get_weather',
        description: 'Get the weather',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city'],
        },
      });
    });

    it('folds a single system message into instructions and removes it from the conversation', () => {
      const dto = buildRequest({
        messages: [
          { role: 'system', content: 'You are X' },
          { role: 'user', content: 'hi' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.instructions).toBe('You are X');
      expect(cmd.messages).toHaveLength(1);
      expect(cmd.messages[0]).toBeInstanceOf(UserMessage);
    });

    it('joins multiple system messages with double newlines', () => {
      const dto = buildRequest({
        messages: [
          { role: 'system', content: 'first' },
          { role: 'system', content: 'second' },
          { role: 'user', content: 'hi' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.instructions).toBe('first\n\nsecond');
      expect(cmd.messages).toHaveLength(1);
    });

    it('does not fold an empty-string system message into instructions', () => {
      const dto = buildRequest({
        messages: [
          { role: 'system', content: '' },
          { role: 'user', content: 'hi' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.instructions).toBeUndefined();
    });

    it('maps an assistant message with text + tool_calls into both TextMessageContent and ToolUseMessageContent parts', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: 'sure, calling the tool',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Berlin"}',
                },
              },
            ],
          },
          {
            role: 'tool',
            content: 'sunny',
            tool_call_id: 'call_1',
          },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.messages).toHaveLength(3);
      const assistant = cmd.messages[1] as AssistantMessage;
      expect(assistant).toBeInstanceOf(AssistantMessage);
      expect(assistant.content).toHaveLength(2);
      expect(assistant.content[0]).toBeInstanceOf(TextMessageContent);
      expect((assistant.content[0] as TextMessageContent).text).toBe(
        'sure, calling the tool',
      );
      expect(assistant.content[1]).toBeInstanceOf(ToolUseMessageContent);
      const toolUse = assistant.content[1] as ToolUseMessageContent;
      expect(toolUse.id).toBe('call_1');
      expect(toolUse.name).toBe('get_weather');
      expect(toolUse.params).toEqual({ city: 'Berlin' });
    });

    it('throws BadRequestException when a tool message has no tool_call_id', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{}' },
              },
            ],
          },
          { role: 'tool', content: 'sunny' },
        ],
      });

      expect(() =>
        mapper.toGetInferenceCommand(dto, buildPermittedLanguageModel()),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException when a tool message references an unknown tool_call_id', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            content: 'sunny',
            tool_call_id: 'call_unknown',
          },
        ],
      });

      expect(() =>
        mapper.toGetInferenceCommand(dto, buildPermittedLanguageModel()),
      ).toThrow(BadRequestException);
    });

    it('resolves a reused tool_call_id against the most recent assistant turn (not the first occurrence)', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{}' },
              },
            ],
          },
          { role: 'tool', content: 'sunny', tool_call_id: 'call_1' },
          { role: 'user', content: 'and the time?' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_time', arguments: '{}' },
              },
            ],
          },
          { role: 'tool', content: '12:00', tool_call_id: 'call_1' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      const firstResult = cmd.messages[2] as ToolResultMessage;
      const secondResult = cmd.messages[5] as ToolResultMessage;
      expect(firstResult.content[0].toolName).toBe('get_weather');
      expect(secondResult.content[0].toolName).toBe('get_time');
    });

    it('produces a ToolResultMessageContent with the resolved tool name (not the tool_call_id)', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{}' },
              },
            ],
          },
          {
            role: 'tool',
            content: 'sunny',
            tool_call_id: 'call_1',
          },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      const toolResultMsg = cmd.messages[2] as ToolResultMessage;
      expect(toolResultMsg).toBeInstanceOf(ToolResultMessage);
      const part = toolResultMsg.content[0];
      expect(part).toBeInstanceOf(ToolResultMessageContent);
      expect(part.toolId).toBe('call_1');
      expect(part.toolName).toBe('get_weather');
      expect(part.result).toBe('sunny');
    });

    it('maps tool_choice "required" to ModelToolChoice.REQUIRED', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: 'hi' }],
        tool_choice: 'required',
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.toolChoice).toBe(ModelToolChoice.REQUIRED);
    });

    it('defaults tool_choice to ModelToolChoice.AUTO when omitted', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: 'hi' }],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      expect(cmd.toolChoice).toBe(ModelToolChoice.AUTO);
    });

    it('parses an empty tool_call.arguments string as an empty object', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'noop', arguments: '' },
              },
            ],
          },
          { role: 'tool', content: 'ok', tool_call_id: 'call_1' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      const assistant = cmd.messages[1] as AssistantMessage;
      const toolUse = assistant.content[0] as ToolUseMessageContent;
      expect(toolUse).toBeInstanceOf(ToolUseMessageContent);
      expect(toolUse.params).toEqual({});
    });

    it('parses valid JSON object tool_call.arguments', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'echo',
                  arguments: '{"a":1,"b":"two"}',
                },
              },
            ],
          },
          { role: 'tool', content: 'ok', tool_call_id: 'call_1' },
        ],
      });

      const cmd = mapper.toGetInferenceCommand(
        dto,
        buildPermittedLanguageModel(),
      );

      const assistant = cmd.messages[1] as AssistantMessage;
      const toolUse = assistant.content[0] as ToolUseMessageContent;
      expect(toolUse.params).toEqual({ a: 1, b: 'two' });
    });

    it('throws BadRequestException when tool_call.arguments encodes a non-object JSON value', () => {
      const dto = buildRequest({
        messages: [
          { role: 'user', content: 'hi' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'echo', arguments: '[1,2,3]' },
              },
            ],
          },
          { role: 'tool', content: 'ok', tool_call_id: 'call_1' },
        ],
      });

      expect(() =>
        mapper.toGetInferenceCommand(dto, buildPermittedLanguageModel()),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException for a user message with empty content', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: '' }],
      });

      expect(() =>
        mapper.toGetInferenceCommand(dto, buildPermittedLanguageModel()),
      ).toThrow(BadRequestException);
    });
  });

  describe('toStreamInferenceInput', () => {
    it('passes the inline tools through the `tools` field of StreamInferenceInput', () => {
      const dto = buildRequest({
        messages: [{ role: 'user', content: 'hi' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'desc',
              parameters: { type: 'object', properties: {} },
            },
          },
        ],
        tool_choice: 'required',
      });

      const input = mapper.toStreamInferenceInput(
        dto,
        buildPermittedLanguageModel(),
        orgId,
      );

      expect(input.tools).toHaveLength(1);
      expect(input.tools[0].name).toBe('get_weather');
      expect(input.toolChoice).toBe(ModelToolChoice.REQUIRED);
      expect(input.orgId).toBe(orgId);
      expect(input.systemPrompt).toBe('');
    });

    it('maps the system prompt onto `systemPrompt`', () => {
      const dto = buildRequest({
        messages: [
          { role: 'system', content: 'be terse' },
          { role: 'user', content: 'hi' },
        ],
      });

      const input = mapper.toStreamInferenceInput(
        dto,
        buildPermittedLanguageModel(),
        orgId,
      );

      expect(input.systemPrompt).toBe('be terse');
    });
  });
});
