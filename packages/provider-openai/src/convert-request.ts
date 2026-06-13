import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from 'openai/resources/chat/completions';

import type {
  Message,
  MessageContent,
  ToolChoice,
  ToolSchema,
} from '@ayunis/inference';

import { normalizeSchemaForOpenAI } from './normalize-schema';

export const convertTool = (tool: ToolSchema): ChatCompletionTool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    // OpenAI requires strict-mode-compatible schemas (unsupported `format`
    // values stripped, all properties required, additionalProperties false);
    // strict tool calling is this provider's default.
    parameters: normalizeSchemaForOpenAI(tool.parameters),
    strict: true,
  },
});

// OpenAI's tool_choice is inherently a string ('auto'/'required') or a named
// tool object, so this function's return type is necessarily mixed.
/* eslint-disable sonarjs/function-return-type */
export const convertToolChoice = (
  toolChoice: ToolChoice,
): ChatCompletionToolChoiceOption => {
  if (toolChoice === 'auto') {
    return 'auto';
  }
  if (toolChoice === 'required') {
    return 'required';
  }
  return { type: 'function', function: { name: toolChoice.tool } };
};
/* eslint-enable sonarjs/function-return-type */

/**
 * Converts the runtime request to OpenAI Chat Completions messages.
 * `instructions` becomes a leading system message; in-thread `system` messages
 * map to their own system message; assistant tool calls map to `tool_calls`;
 * each runtime tool_result becomes its own `tool` message. Thinking content is
 * dropped — Chat Completions has no replay slot for it.
 */
export const convertMessages = (
  instructions: string,
  messages: readonly Message[],
): ChatCompletionMessageParam[] => {
  const converted: ChatCompletionMessageParam[] = [];
  if (instructions) {
    converted.push({ role: 'system', content: instructions });
  }
  for (const message of messages) {
    if (message.role === 'assistant') {
      const assistant = convertAssistant(message.content);
      // Skip assistant turns with neither text nor tool calls (e.g. a
      // thinking-only turn, since thinking is dropped) — Chat Completions
      // rejects an assistant message with null content and no tool_calls.
      if (assistant.content !== null || assistant.tool_calls) {
        converted.push(assistant);
      }
    } else if (message.role === 'tool_result') {
      converted.push(...convertToolResults(message.content));
    } else if (message.role === 'system') {
      converted.push({ role: 'system', content: joinText(message.content) });
    } else {
      converted.push({ role: 'user', content: joinText(message.content) });
    }
  }
  return converted;
};

const convertAssistant = (
  content: readonly MessageContent[],
): ChatCompletionAssistantMessageParam => {
  const toolCalls = content
    .filter((c): c is Extract<MessageContent, { type: 'tool_use' }> => {
      return c.type === 'tool_use';
    })
    .map(
      (c): ChatCompletionMessageToolCall => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.input) },
      }),
    );
  const text = joinText(content);
  const message: ChatCompletionAssistantMessageParam = {
    role: 'assistant',
    content: text || null,
  };
  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }
  return message;
};

const convertToolResults = (
  content: readonly MessageContent[],
): ChatCompletionMessageParam[] =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'tool_result' }> => {
      return c.type === 'tool_result';
    })
    .map((c) => ({
      role: 'tool',
      tool_call_id: c.toolCallId,
      // Chat Completions tool messages have no structured error field, so fold
      // the runtime's isError flag into the content the model sees.
      content: c.isError ? `Error: ${c.result}` : c.result,
    }));

const joinText = (content: readonly MessageContent[]): string =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'text' }> => {
      return c.type === 'text';
    })
    .map((c) => c.text)
    .join('');
