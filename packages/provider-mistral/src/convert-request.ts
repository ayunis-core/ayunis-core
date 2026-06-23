import type {
  ContentChunk,
  Messages,
  Tool,
  ToolCall,
  ToolChoice as MistralToolChoice,
  ToolChoiceEnum,
} from '@mistralai/mistralai/models/components';

import type {
  Message,
  MessageContent,
  ToolChoice,
  ToolSchema,
} from '@ayunis/inference';

export const convertTool = (tool: ToolSchema): Tool => ({
  type: 'function',
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  },
});

// Mistral's tool_choice is a string ('auto'/'required') or a named-tool object,
// so this function's return type is necessarily mixed.
/* eslint-disable sonarjs/function-return-type */
export const convertToolChoice = (
  toolChoice: ToolChoice,
): MistralToolChoice | ToolChoiceEnum => {
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
 * Converts the runtime request to Mistral chat messages. `instructions`
 * becomes a leading system message; in-thread `system` messages map to their
 * own system message; assistant tool calls map to `toolCalls`; each runtime
 * tool_result becomes its own `tool` message. Thinking content is dropped —
 * Mistral's chat API has no replay slot for it.
 */
export const convertMessages = (
  instructions: string,
  messages: readonly Message[],
): Messages[] => {
  const converted: Messages[] = [];
  if (instructions) {
    converted.push({ role: 'system', content: instructions });
  }
  for (const message of messages) {
    if (message.role === 'assistant') {
      const assistant = convertAssistant(message.content);
      // Skip assistant turns with neither text nor tool calls (e.g. a
      // thinking-only turn, since thinking is dropped) — an assistant message
      // with no content and no tool calls carries nothing.
      if (assistant.content !== undefined || assistant.toolCalls) {
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
 * chunks (text + image_url) when it carries images. Images arrive already
 * resolved; they are emitted as base64 data URIs.
 */
const convertUser = (
  content: readonly MessageContent[],
): Messages & { role: 'user' } => {
  const hasImage = content.some((c) => c.type === 'image');
  if (!hasImage) {
    return { role: 'user', content: joinText(content) };
  }
  // Preserve the original order of text and image parts rather than hoisting
  // all text ahead of all images.
  const parts: ContentChunk[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      if (c.text) {
        parts.push({ type: 'text', text: c.text });
      }
    } else if (c.type === 'image') {
      parts.push({
        type: 'image_url',
        imageUrl: { url: `data:${c.mediaType};base64,${c.data}` },
      });
    }
  }
  return { role: 'user', content: parts };
};

const convertAssistant = (
  content: readonly MessageContent[],
): Messages & { role: 'assistant' } => {
  const toolCalls = content
    .filter((c): c is Extract<MessageContent, { type: 'tool_use' }> => {
      return c.type === 'tool_use';
    })
    .map(
      (c): ToolCall => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.input) },
      }),
    );
  const text = joinText(content);
  const message: Messages & { role: 'assistant' } = {
    role: 'assistant',
    content: text || undefined,
  };
  if (toolCalls.length > 0) {
    message.toolCalls = toolCalls;
  }
  return message;
};

const convertToolResults = (content: readonly MessageContent[]): Messages[] =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'tool_result' }> => {
      return c.type === 'tool_result';
    })
    .map((c) => ({
      role: 'tool',
      toolCallId: c.toolCallId,
      // Mistral tool messages have no structured error field, so fold the
      // runtime's isError flag into the content the model sees.
      content: c.isError ? `Error: ${c.result}` : c.result,
    }));

const joinText = (content: readonly MessageContent[]): string =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'text' }> => {
      return c.type === 'text';
    })
    .map((c) => c.text)
    .join('');
