import type {
  Message as OllamaMessage,
  Tool as OllamaTool,
  ToolCall as OllamaToolCall,
} from 'ollama';

import type {
  Message,
  MessageContent,
  ToolSchema,
  ToolNameCodec,
} from '@ayunis/inference';

/**
 * Ollama tool functions accept a `strict` flag the SDK's `Tool` type does not
 * model; the pre-runtime handler set it on every tool, so it is preserved here.
 */
type OllamaToolFunction = OllamaTool['function'] & { strict?: boolean };

export const convertTool = (
  tool: ToolSchema,
  codec: ToolNameCodec,
): OllamaTool => {
  const fn: OllamaToolFunction = {
    name: codec.encode(tool.name),
    description: tool.description,
    parameters: tool.parameters,
    strict: true,
  };
  return { type: 'function', function: fn };
};

/**
 * Converts the runtime request to Ollama chat messages. `instructions` becomes
 * a leading system message; in-thread `system` messages map to their own
 * system message; assistant turns carry text, native `thinking` and
 * `tool_calls`; each runtime tool_result becomes its own `tool` message.
 * Images arrive already resolved and are emitted as base64 strings.
 */
export const convertMessages = (
  instructions: string,
  messages: readonly Message[],
  codec: ToolNameCodec,
): OllamaMessage[] => {
  const converted: OllamaMessage[] = [];
  if (instructions) {
    converted.push({ role: 'system', content: instructions });
  }
  for (const message of messages) {
    if (message.role === 'assistant') {
      converted.push(convertAssistant(message.content, codec));
    } else if (message.role === 'tool_result') {
      converted.push(...convertToolResults(message.content));
    } else if (message.role === 'system') {
      converted.push({ role: 'system', content: joinText(message.content) });
    } else {
      const user = convertUser(message.content);
      if (user) {
        converted.push(user);
      }
    }
  }
  return converted;
};

/**
 * A user turn carries joined text plus any resolved images as base64 strings.
 * Turns with neither text nor images are dropped (nothing to send).
 */
const convertUser = (
  content: readonly MessageContent[],
): (OllamaMessage & { role: 'user' }) | null => {
  const textParts: string[] = [];
  const images: string[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      textParts.push(c.text);
    } else if (c.type === 'image') {
      images.push(c.data);
    }
  }
  if (textParts.length === 0 && images.length === 0) {
    return null;
  }
  return {
    role: 'user',
    content: textParts.join('\n'),
    images: images.length > 0 ? images : undefined,
  };
};

const convertAssistant = (
  content: readonly MessageContent[],
  codec: ToolNameCodec,
): OllamaMessage & { role: 'assistant' } => {
  let text: string | undefined;
  let thinking: string | undefined;
  const toolCalls: OllamaToolCall[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      text = c.text;
    } else if (c.type === 'thinking') {
      thinking = c.thinking;
    } else if (c.type === 'tool_use') {
      toolCalls.push({
        function: { name: codec.encode(c.name), arguments: c.input },
      });
    }
  }
  return {
    role: 'assistant',
    content: text ?? '',
    thinking,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
};

const convertToolResults = (
  content: readonly MessageContent[],
): OllamaMessage[] =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'tool_result' }> => {
      return c.type === 'tool_result';
    })
    .map((c) => ({ role: 'tool', content: c.result }));

const joinText = (content: readonly MessageContent[]): string =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'text' }> => {
      return c.type === 'text';
    })
    .map((c) => c.text)
    .join('');
