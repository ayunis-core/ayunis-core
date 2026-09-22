import { schemaAllowsNull } from '@ayunis/inference';

import type { Message, MessageContent } from '../contracts/message';
import type { ProviderRequest, ToolChoice } from '../contracts/provider';
import type { Tool } from '../contracts/tool';
import type { MutableRunConfig } from './mutations';

export type ModelCallMode = 'normal' | 'tool_disabled_fallback';

const FALLBACK_INSTRUCTION =
  'Previous attempts produced malformed tool calls. Do not call tools. ' +
  'Respond directly with the most useful explanation or answer you can provide.';

export const cloneRunConfig = (config: MutableRunConfig): MutableRunConfig => ({
  instructions: config.instructions,
  messages: cloneMessages(config.messages),
  tools: config.tools.map(cloneTool),
});

export const immutableToolsSnapshot = (
  tools: readonly Tool[],
): readonly Tool[] => deepFreeze(tools.map(cloneTool));

export const requestSnapshot = (options: {
  config: MutableRunConfig;
  mode: ModelCallMode;
  toolChoice?: ToolChoice;
  signal: AbortSignal;
  sanitize: boolean;
}): ProviderRequest => {
  const request = toProviderRequest(options);
  const result = options.sanitize ? sanitizeToolInputs(request) : request;
  return deepFreeze(result);
};

const toProviderRequest = (options: {
  config: MutableRunConfig;
  mode: ModelCallMode;
  toolChoice?: ToolChoice;
  signal: AbortSignal;
}): ProviderRequest => {
  const tools =
    options.mode === 'normal'
      ? options.config.tools.map(({ name, description, parameters }) => ({
          name,
          description,
          parameters: cloneUnknown(parameters),
        }))
      : [];
  const instructions =
    options.mode === 'normal'
      ? options.config.instructions
      : `${options.config.instructions}\n\n${FALLBACK_INSTRUCTION}`;
  return {
    instructions,
    messages: cloneMessages(options.config.messages),
    tools,
    ...(options.toolChoice !== undefined && tools.length > 0
      ? { toolChoice: options.toolChoice }
      : {}),
    signal: options.signal,
  };
};

const cloneMessages = (messages: readonly Message[]): Message[] =>
  messages.map((message) => ({
    ...message,
    content: message.content.map((content) => cloneUnknown(content)),
  }));

const cloneTool = (tool: Tool): Tool => ({
  ...tool,
  parameters: cloneUnknown(tool.parameters),
});

const cloneUnknown = <T>(value: T): T => {
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    return items.map((item) => cloneUnknown(item)) as unknown as T;
  }
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, cloneUnknown(nested)]),
  ) as T;
};

const deepFreeze = <T>(value: T): T => {
  if (!isRecord(value) && !Array.isArray(value)) return value;
  if (typeof AbortSignal !== 'undefined' && value instanceof AbortSignal) {
    return value;
  }
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

const sanitizeToolInputs = (request: ProviderRequest): ProviderRequest => {
  const schemas = new Map(
    request.tools.map((tool) => [tool.name, tool.parameters] as const),
  );
  const messages = request.messages.map((message) =>
    sanitizeMessage(message, schemas),
  );
  return { ...request, messages };
};

const sanitizeMessage = (
  message: Message,
  schemas: ReadonlyMap<string, unknown>,
): Message => {
  if (message.role !== 'assistant') return message;
  return {
    ...message,
    content: message.content.map((content) =>
      sanitizeToolInput(content, schemas),
    ),
  };
};

const sanitizeToolInput = (
  content: MessageContent,
  schemas: ReadonlyMap<string, unknown>,
): MessageContent => {
  if (content.type !== 'tool_use') return content;
  const schema = schemas.get(content.name);
  if (!isRecord(schema)) return content;
  return {
    ...content,
    input: stripObject(content.input, schema, schema),
  };
};

const stripObject = (
  input: Record<string, unknown>,
  schema: unknown,
  root: Record<string, unknown>,
): Record<string, unknown> => {
  const shape = resolveShape(schema, root, 'properties');
  const properties = shape?.properties;
  if (!isRecord(properties)) return input;
  const entries = Object.entries(input).flatMap(([key, value]) => {
    const propertySchema = resolveRef(properties[key], root);
    if (value === null && propertySchema && !allowsNull(propertySchema, root)) {
      return [];
    }
    return [[key, stripNested(value, propertySchema, root)] as const];
  });
  return Object.fromEntries(entries);
};

const stripNested = (
  value: unknown,
  schema: unknown,
  root: Record<string, unknown>,
): unknown => {
  if (schema === undefined) return value;
  if (Array.isArray(value)) return stripArray(value, schema, root);
  return isRecord(value) ? stripObject(value, schema, root) : value;
};

const stripArray = (
  values: unknown[],
  schema: unknown,
  root: Record<string, unknown>,
): unknown[] => {
  const shape = resolveShape(schema, root, 'items');
  if (shape?.items === undefined || Array.isArray(shape.items)) return values;
  return values.map((value) => stripNested(value, shape.items, root));
};

const resolveShape = (
  schema: unknown,
  root: Record<string, unknown>,
  key: 'properties' | 'items',
): Record<string, unknown> | undefined => {
  const matches: Record<string, unknown>[] = [];
  const queue: unknown[] = [schema];
  const seen = new Set<unknown>();
  while (queue.length > 0) {
    const node = resolveRef(queue.shift(), root);
    if (!node || seen.has(node)) continue;
    seen.add(node);
    if (node[key] !== undefined) matches.push(node);
    else queue.push(...branches(node));
  }
  return matches.length === 1 ? matches[0] : undefined;
};

const branches = (schema: Record<string, unknown>): unknown[] => {
  const result: unknown[] = [];
  for (const value of [schema.anyOf, schema.oneOf, schema.allOf]) {
    if (Array.isArray(value)) result.push(...(value as unknown[]));
  }
  return result;
};

const resolveRef = (
  schema: unknown,
  root: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const seen = new Set<string>();
  let current = schema;
  while (isRecord(current) && typeof current.$ref === 'string') {
    if (seen.has(current.$ref)) return undefined;
    seen.add(current.$ref);
    current = resolvePointer(current.$ref, root);
  }
  return isRecord(current) ? current : undefined;
};

const resolvePointer = (
  ref: string,
  root: Record<string, unknown>,
): unknown => {
  if (ref === '#') return root;
  if (!ref.startsWith('#/')) return undefined;
  let node: unknown = root;
  for (const segment of ref.slice(2).split('/')) {
    if (!isRecord(node)) return undefined;
    node = node[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
  }
  return node;
};

const allowsNull = (
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
): boolean =>
  schemaAllowsNull(schema, {
    resolveBranch: (branch) => resolveRef(branch, root),
    openApiNullable: true,
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
