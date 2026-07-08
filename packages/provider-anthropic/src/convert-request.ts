import type Anthropic from '@anthropic-ai/sdk';

import type {
  Message,
  MessageContent,
  ToolChoice,
  ToolSchema,
} from '@ayunis/inference';

import { normalizeSchemaForAnthropic } from './normalize-schema';

type AnthropicToolChoice =
  | Anthropic.Messages.ToolChoiceAuto
  | Anthropic.Messages.ToolChoiceAny
  | Anthropic.Messages.ToolChoiceTool;

export const convertTool = (tool: ToolSchema): Anthropic.Tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: normalizeSchemaForAnthropic(tool.parameters),
});

export const convertToolChoice = (
  toolChoice: ToolChoice,
): AnthropicToolChoice => {
  if (toolChoice === 'auto') {
    return { type: 'auto' };
  }
  if (toolChoice === 'required') {
    return { type: 'any' };
  }
  return { type: 'tool', name: toolChoice.tool };
};

/**
 * Converts runtime messages to Anthropic params. Consecutive non-assistant
 * messages (user input, tool results) are merged into a single user turn —
 * Anthropic requires alternating user/assistant roles.
 */
export const convertMessages = (
  messages: readonly Message[],
): Anthropic.MessageParam[] => {
  const converted: Anthropic.MessageParam[] = [];
  for (const message of messages) {
    const next = convertMessage(message);
    // A message can convert to nothing (e.g. an assistant turn whose only
    // content was unsigned thinking) — Anthropic rejects empty content.
    if (asBlocks(next.content).length === 0) {
      continue;
    }
    const last = converted.at(-1);
    if (last?.role === 'user' && next.role === 'user') {
      last.content = [...asBlocks(last.content), ...asBlocks(next.content)];
    } else {
      converted.push(next);
    }
  }
  // Anthropic rejects an empty messages array. If a non-empty history reduced
  // to nothing (every turn dropped as empty content), surface a clear error
  // rather than letting the API fail with an opaque 400.
  if (converted.length === 0 && messages.length > 0) {
    throw new Error(
      'Cannot build an Anthropic request: all messages converted to empty content',
    );
  }
  return converted;
};

const asBlocks = (
  content: Anthropic.MessageParam['content'],
): Anthropic.ContentBlockParam[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : content;

const convertMessage = (message: Message): Anthropic.MessageParam => {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content
        .map(convertAssistantContent)
        .filter((block): block is NonNullable<typeof block> => block !== null),
    };
  }
  return { role: 'user', content: message.content.map(convertUserContent) };
};

const convertAssistantContent = (
  content: MessageContent,
): Anthropic.ContentBlockParam | null => {
  switch (content.type) {
    case 'thinking':
      // Thinking blocks without a signature cannot be replayed to Anthropic.
      if (!content.signature) {
        return null;
      }
      return {
        type: 'thinking',
        thinking: content.thinking,
        signature: content.signature,
      };
    case 'text':
      return { type: 'text', text: content.text };
    case 'tool_use':
      return {
        type: 'tool_use',
        id: content.id,
        name: content.name,
        input: content.input,
      };
    case 'tool_result':
    case 'image':
      return null;
  }
};

const convertUserContent = (
  content: MessageContent,
): Anthropic.ContentBlockParam => {
  switch (content.type) {
    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: content.toolCallId,
        content: content.result,
        ...(content.isError ? { is_error: true } : {}),
      };
    case 'image':
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type:
            content.mediaType as Anthropic.Base64ImageSource['media_type'],
          data: content.data,
        },
      };
    case 'text':
    case 'thinking':
    case 'tool_use':
      return {
        type: 'text',
        text: content.type === 'text' ? content.text : '',
      };
  }
};
