import type Anthropic from '@anthropic-ai/sdk';

import type {
  Message,
  MessageContent,
  ToolChoice,
  ToolSchema,
  ToolNameCodec,
} from '@ayunis/inference';

import { normalizeSchemaForAnthropic } from './normalize-schema';

type AnthropicToolChoice =
  | Anthropic.Messages.ToolChoiceAuto
  | Anthropic.Messages.ToolChoiceAny
  | Anthropic.Messages.ToolChoiceTool;

const EPHEMERAL_CACHE = { type: 'ephemeral' } as const;

/**
 * Converts instructions to the Anthropic system param, marking them as a
 * prompt-cache breakpoint. Because Anthropic renders tools → system →
 * messages, this one breakpoint caches the tool definitions and the system
 * prompt together. Empty instructions pass through — a marker on an empty
 * block would be a pointless cache entry.
 */
export const convertSystem = (
  instructions: string,
): string | Anthropic.TextBlockParam[] =>
  instructions
    ? [{ type: 'text', text: instructions, cache_control: EPHEMERAL_CACHE }]
    : instructions;

/** Block types that accept cache_control (thinking blocks do not). */
const CACHEABLE_BLOCK_TYPES = new Set([
  'text',
  'image',
  'tool_use',
  'tool_result',
  'document',
]);

/**
 * Marks the last cacheable content block of the last message as a
 * prompt-cache breakpoint, so each request reuses the cache entry the
 * previous turn (or agent-loop iteration) wrote. The marker moves with the
 * conversation tail; earlier entries stay valid as read points.
 */
export const markCacheBreakpoint = (
  messages: Anthropic.MessageParam[],
): Anthropic.MessageParam[] => {
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return messages;
  }
  const blocks = asBlocks(lastMessage.content);
  const lastCacheable = blocks.findLast((block) =>
    CACHEABLE_BLOCK_TYPES.has(block.type),
  );
  if (!lastCacheable) {
    return messages;
  }
  const markedContent = blocks.map((block) =>
    block === lastCacheable
      ? { ...block, cache_control: EPHEMERAL_CACHE }
      : block,
  );
  return [...messages.slice(0, -1), { ...lastMessage, content: markedContent }];
};

export const convertTool = (
  tool: ToolSchema,
  codec: ToolNameCodec,
): Anthropic.Tool => ({
  name: codec.encode(tool.name),
  description: tool.description,
  input_schema: normalizeSchemaForAnthropic(tool.parameters),
});

export const convertToolChoice = (
  toolChoice: ToolChoice,
  codec: ToolNameCodec,
): AnthropicToolChoice => {
  if (toolChoice === 'auto') {
    return { type: 'auto' };
  }
  if (toolChoice === 'required') {
    return { type: 'any' };
  }
  return { type: 'tool', name: codec.encode(toolChoice.tool) };
};

/**
 * Converts runtime messages to Anthropic params. Consecutive non-assistant
 * messages (user input, tool results) are merged into a single user turn —
 * Anthropic requires alternating user/assistant roles.
 */
export const convertMessages = (
  messages: readonly Message[],
  codec: ToolNameCodec,
): Anthropic.MessageParam[] => {
  const converted: Anthropic.MessageParam[] = [];
  for (const message of messages) {
    const next = convertMessage(message, codec);
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

const convertMessage = (
  message: Message,
  codec: ToolNameCodec,
): Anthropic.MessageParam => {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content
        .map((content) => convertAssistantContent(content, codec))
        .filter((block): block is NonNullable<typeof block> => block !== null),
    };
  }
  return { role: 'user', content: message.content.map(convertUserContent) };
};

const convertAssistantContent = (
  content: MessageContent,
  codec: ToolNameCodec,
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
        name: codec.encode(content.name),
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
