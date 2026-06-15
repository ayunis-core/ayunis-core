import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletionUserMessageParam,
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
      converted.push(convertUser(message.content));
    }
  }
  return converted;
};

/**
 * A user turn is a plain string when it is text-only, or an array of content
 * parts (text + image_url) when it carries images. Images arrive already
 * resolved; they are emitted as base64 data URIs.
 */
const convertUser = (
  content: readonly MessageContent[],
): ChatCompletionUserMessageParam => {
  const hasImage = content.some((c) => c.type === 'image');
  if (!hasImage) {
    return { role: 'user', content: joinText(content) };
  }
  // Preserve the original order of text and image parts (e.g. image-then-text
  // or interleaved) rather than hoisting all text ahead of all images.
  const parts: ChatCompletionContentPart[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      if (c.text) {
        parts.push({ type: 'text', text: c.text });
      }
    } else if (c.type === 'image') {
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${c.mediaType};base64,${c.data}` },
      });
    }
  }
  return { role: 'user', content: parts };
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
