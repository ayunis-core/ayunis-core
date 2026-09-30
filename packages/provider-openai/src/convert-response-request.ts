import type {
  EasyInputMessage,
  FunctionTool,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseInputContent,
  ResponseInputItem,
  ResponseReasoningItem,
  ToolChoiceFunction,
  ToolChoiceOptions,
} from 'openai/resources/responses/responses';

import type {
  Message,
  MessageContent,
  ToolChoice,
  ToolNameCodec,
  ToolSchema,
} from '@ayunis/inference';
import { isRecord } from '@ayunis/inference';

import {
  canNormalizeSchemaForOpenAIStrictMode,
  normalizeSchemaForOpenAI,
  normalizeSchemaForOpenAINonStrictMode,
} from './normalize-schema';

export const convertResponseTool = (
  tool: ToolSchema,
  codec: ToolNameCodec,
): FunctionTool => {
  const strict = canNormalizeSchemaForOpenAIStrictMode(tool.parameters);
  return {
    type: 'function',
    name: codec.encode(tool.name),
    description: tool.description,
    parameters: strict
      ? normalizeSchemaForOpenAI(tool.parameters)
      : normalizeSchemaForOpenAINonStrictMode(tool.parameters),
    strict,
  };
};

/* eslint-disable sonarjs/function-return-type */
export const convertResponseToolChoice = (
  toolChoice: ToolChoice,
  codec: ToolNameCodec,
): ToolChoiceOptions | ToolChoiceFunction => {
  if (toolChoice === 'auto' || toolChoice === 'required') return toolChoice;
  return { type: 'function', name: codec.encode(toolChoice.tool) };
};
/* eslint-enable sonarjs/function-return-type */

export const convertResponseInput = (
  messages: readonly Message[],
  codec: ToolNameCodec,
): ResponseInput =>
  messages.flatMap((message) => convertMessage(message, codec));

const convertMessage = (
  message: Message,
  codec: ToolNameCodec,
): ResponseInputItem[] => {
  switch (message.role) {
    case 'assistant':
      return convertAssistant(message.content, codec);
    case 'tool_result':
      return convertToolResults(message.content);
    case 'system':
      return [{ role: 'system', content: joinText(message.content) }];
    case 'user':
      return [convertUser(message.content)];
  }
};

const convertUser = (content: readonly MessageContent[]): EasyInputMessage => {
  const hasImage = content.some((item) => item.type === 'image');
  if (!hasImage) return { role: 'user', content: joinText(content) };
  return { role: 'user', content: convertUserParts(content) };
};

const convertUserParts = (
  content: readonly MessageContent[],
): ResponseInputContent[] =>
  content.flatMap((item): ResponseInputContent[] => {
    if (item.type === 'text' && item.text) {
      return [{ type: 'input_text', text: item.text }];
    }
    if (item.type === 'image') {
      return [
        {
          type: 'input_image',
          detail: 'auto',
          image_url: `data:${item.mediaType};base64,${item.data}`,
        },
      ];
    }
    return [];
  });

const convertAssistant = (
  content: readonly MessageContent[],
  codec: ToolNameCodec,
): ResponseInputItem[] => {
  const items: ResponseInputItem[] = [];
  items.push(...getReasoningItems(content));
  const text = joinText(content);
  if (text) items.push({ role: 'assistant', content: text });
  items.push(...convertToolCalls(content, codec));
  return items;
};

const getReasoningItems = (
  content: readonly MessageContent[],
): ResponseReasoningItem[] =>
  content.flatMap((item) => {
    if (item.type !== 'tool_use' && item.type !== 'text') return [];
    const stored = item.providerMetadata?.openaiReasoning;
    if (!Array.isArray(stored)) return [];
    return stored.flatMap((value) => {
      const reasoningItem = toReasoningItem(value);
      return reasoningItem ? [reasoningItem] : [];
    });
  });

const toReasoningItem = (value: unknown): ResponseReasoningItem | null => {
  if (
    !isRecord(value) ||
    value.type !== 'reasoning' ||
    typeof value.id !== 'string' ||
    typeof value.encrypted_content !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    type: 'reasoning',
    summary: [],
    encrypted_content: value.encrypted_content,
    ...(isReasoningStatus(value.status) ? { status: value.status } : {}),
  };
};

const isReasoningStatus = (
  value: unknown,
): value is 'in_progress' | 'completed' | 'incomplete' =>
  value === 'in_progress' || value === 'completed' || value === 'incomplete';

const convertToolCalls = (
  content: readonly MessageContent[],
  codec: ToolNameCodec,
): ResponseFunctionToolCall[] =>
  content
    .filter(
      (item): item is Extract<MessageContent, { type: 'tool_use' }> =>
        item.type === 'tool_use',
    )
    .map((item) => ({
      type: 'function_call',
      call_id: item.id,
      name: codec.encode(item.name),
      arguments: JSON.stringify(item.input),
    }));

const convertToolResults = (
  content: readonly MessageContent[],
): ResponseInputItem.FunctionCallOutput[] =>
  content
    .filter(
      (item): item is Extract<MessageContent, { type: 'tool_result' }> =>
        item.type === 'tool_result',
    )
    .map((item) => ({
      type: 'function_call_output',
      call_id: item.toolCallId,
      output: item.isError ? `Error: ${item.result}` : item.result,
    }));

const joinText = (content: readonly MessageContent[]): string =>
  content
    .filter(
      (item): item is Extract<MessageContent, { type: 'text' }> =>
        item.type === 'text',
    )
    .map((item) => item.text)
    .join('');
