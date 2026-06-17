import type {
  Content,
  FunctionCallingConfig,
  FunctionDeclaration,
  GenerateContentConfig,
  Part,
} from '@google/genai';
import { FunctionCallingConfigMode } from '@google/genai';

import type {
  Message,
  MessageContent,
  ProviderMetadata,
  ToolChoice,
  ToolSchema,
} from '@ayunis/inference';

export const convertTool = (tool: ToolSchema): FunctionDeclaration => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
});

export const convertToolChoice = (
  toolChoice: ToolChoice,
): FunctionCallingConfig => {
  if (toolChoice === 'auto') {
    return { mode: FunctionCallingConfigMode.AUTO };
  }
  if (toolChoice === 'required') {
    return { mode: FunctionCallingConfigMode.ANY };
  }
  return {
    mode: FunctionCallingConfigMode.ANY,
    allowedFunctionNames: [toolChoice.tool],
  };
};

/**
 * Builds the Gemini request config. `instructions` becomes the system
 * instruction (preserving the pre-runtime handler's `role: 'user'` shape);
 * tools are wrapped in a single function-declarations block; tool choice maps
 * to a function-calling config, but only when tools are present.
 */
export const buildConfig = (input: {
  instructions: string;
  tools: readonly ToolSchema[];
  toolChoice?: ToolChoice;
}): GenerateContentConfig => {
  const { instructions, tools, toolChoice } = input;
  const hasTools = tools.length > 0;
  return {
    systemInstruction: instructions
      ? { role: 'user', parts: [{ text: instructions }] }
      : undefined,
    tools: hasTools
      ? [{ functionDeclarations: tools.map(convertTool) }]
      : undefined,
    toolConfig:
      hasTools && toolChoice !== undefined
        ? { functionCallingConfig: convertToolChoice(toolChoice) }
        : undefined,
  };
};

/**
 * Converts runtime messages to Gemini `Content[]`. Roles map to Gemini's
 * `user`/`model`; assistant `text`/`tool_use` parts carry their `thoughtSignature`
 * back so thinking-model turns replay correctly; each tool result becomes a
 * `functionResponse` part. Messages that produce no parts are dropped — Gemini
 * rejects empty content.
 */
export const convertMessages = (messages: readonly Message[]): Content[] => {
  const contents: Content[] = [];
  for (const message of messages) {
    const content = convertMessage(message);
    if (content && (content.parts?.length ?? 0) > 0) {
      contents.push(content);
    }
  }
  return contents;
};

const convertMessage = (message: Message): Content | null => {
  switch (message.role) {
    case 'assistant':
      return { role: 'model', parts: convertAssistant(message.content) };
    case 'tool_result':
      return { role: 'user', parts: convertToolResults(message.content) };
    case 'system':
      return { role: 'user', parts: convertSystem(message.content) };
    case 'user':
      return { role: 'user', parts: convertUser(message.content) };
    default:
      return null;
  }
};

const convertUser = (content: readonly MessageContent[]): Part[] => {
  const parts: Part[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      parts.push({ text: c.text });
    } else if (c.type === 'image') {
      parts.push({ inlineData: { mimeType: c.mediaType, data: c.data } });
    }
  }
  return parts;
};

const convertAssistant = (content: readonly MessageContent[]): Part[] => {
  const parts: Part[] = [];
  for (const c of content) {
    if (c.type === 'text') {
      parts.push(withSignature({ text: c.text }, c.providerMetadata));
    } else if (c.type === 'tool_use') {
      parts.push(
        withSignature(
          { functionCall: { id: c.id, name: c.name, args: c.input } },
          c.providerMetadata,
        ),
      );
    }
  }
  return parts;
};

const convertToolResults = (content: readonly MessageContent[]): Part[] =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'tool_result' }> => {
      return c.type === 'tool_result';
    })
    .map((c) => ({
      functionResponse: {
        id: c.toolCallId,
        name: c.toolName,
        response: { result: c.result },
      },
    }));

const convertSystem = (content: readonly MessageContent[]): Part[] =>
  content
    .filter((c): c is Extract<MessageContent, { type: 'text' }> => {
      return c.type === 'text';
    })
    .map((c) => ({ text: c.text }));

const withSignature = (
  part: Part,
  providerMetadata: ProviderMetadata | undefined,
): Part => {
  const signature = extractThoughtSignature(providerMetadata);
  return signature ? { ...part, thoughtSignature: signature } : part;
};

const extractThoughtSignature = (
  providerMetadata: ProviderMetadata | undefined,
): string | undefined => {
  const gemini = providerMetadata?.gemini;
  if (gemini && typeof gemini === 'object' && 'thoughtSignature' in gemini) {
    const sig = (gemini as { thoughtSignature?: unknown }).thoughtSignature;
    return typeof sig === 'string' ? sig : undefined;
  }
  return undefined;
};
