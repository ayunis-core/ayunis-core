import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';
import type { ToolType } from '../domain/value-objects/tool-type.enum';
import { ToolInvalidContextError } from './tools.errors';

export function contextTypeName(context: unknown): string {
  if (context === null || context === undefined) return 'null';
  return (
    (context as { constructor?: { name?: string } }).constructor?.name ?? 'null'
  );
}

export function requireArrayContext<T>(
  context: unknown,
  itemType: abstract new (...args: never[]) => T,
  toolType: ToolType,
): T[] {
  if (
    context &&
    context instanceof Array &&
    context.every((item: unknown) => item instanceof itemType)
  ) {
    return context as T[];
  }
  throw new ToolInvalidContextError({
    toolType,
    metadata: { contextType: contextTypeName(context) },
  });
}

function isKnowledgeBaseSummary(item: unknown): item is KnowledgeBaseSummary {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    typeof (item as Record<string, unknown>).id === 'string' &&
    'name' in item &&
    typeof (item as Record<string, unknown>).name === 'string'
  );
}

export function requireKnowledgeBaseContext(
  context: unknown,
  toolType: ToolType,
): KnowledgeBaseSummary[] {
  if (
    context &&
    context instanceof Array &&
    context.every(isKnowledgeBaseSummary)
  ) {
    return context;
  }
  throw new ToolInvalidContextError({
    toolType,
    metadata: { contextType: contextTypeName(context) },
  });
}

export function requireMapContext(
  context: unknown,
  toolType: ToolType,
): Map<string, string> {
  if (context instanceof Map) {
    return context as Map<string, string>;
  }
  throw new ToolInvalidContextError({
    toolType,
    metadata: { contextType: contextTypeName(context) },
  });
}

export function requireStringArrayContext(
  context: unknown,
  toolType: ToolType,
): string[] {
  if (
    context instanceof Array &&
    context.every((item: unknown) => typeof item === 'string')
  ) {
    return context;
  }
  throw new ToolInvalidContextError({
    toolType,
    metadata: { contextType: contextTypeName(context) },
  });
}
