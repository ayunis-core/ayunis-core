import type { TFunction } from 'i18next';
import type { ToolAction } from '@ayunis/chat/tool-cards';
import type { ToolUseMessageContentResponseDto as ToolUseMessageContent } from '@ayunis/api-client/schemas';

import { formatToolName } from './format-tool-name';
import { EMPTY_TOOL_CARDS, type ToolCards } from './tool-card-types';

export interface ToolActionLabel {
  verb: string;
  target?: string;
}

const MAX_TARGET_LENGTH = 80;

function truncate(value: string): string {
  return value.length > MAX_TARGET_LENGTH
    ? `${value.slice(0, MAX_TARGET_LENGTH).trimEnd()}…`
    : value;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return truncate(value.trim());
  }
  return undefined;
}

function asStringList(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  return asString(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', '),
  );
}

const textToolActions: ReadonlyMap<string, ToolAction> = new Map([
  [
    'activate_skill',
    {
      labelKey: 'chat.timeline.actions.activate_skill',
      targetParams: ['name'],
    },
  ],
  [
    'get_memory',
    { labelKey: 'chat.timeline.actions.get_memory', targetParams: ['key'] },
  ],
  [
    'set_memory',
    { labelKey: 'chat.timeline.actions.set_memory', targetParams: ['key'] },
  ],
  [
    'internet_search',
    {
      labelKey: 'chat.timeline.actions.internet_search',
      targetParams: ['query'],
    },
  ],
  [
    'website_content',
    {
      labelKey: 'chat.timeline.actions.website_content',
      targetParams: ['url'],
    },
  ],
  [
    'source_query',
    {
      labelKey: 'chat.timeline.actions.source_query',
      listTargetParam: 'queries',
      targetParams: ['query'],
    },
  ],
  [
    'source_get_text',
    {
      labelKey: 'chat.timeline.actions.source_query',
      listTargetParam: 'queries',
      targetParams: ['query'],
    },
  ],
  [
    'knowledge_query',
    {
      labelKey: 'chat.timeline.actions.knowledge_query',
      listTargetParam: 'queries',
      targetParams: ['query'],
    },
  ],
  [
    'knowledge_get_text',
    {
      labelKey: 'chat.timeline.actions.knowledge_query',
      listTargetParam: 'queries',
      targetParams: ['query'],
    },
  ],
  [
    'recording_search',
    {
      labelKey: 'chat.timeline.actions.recording_search',
      listTargetParam: 'queries',
    },
  ],
  ['code_execution', { labelKey: 'chat.timeline.actions.code_execution' }],
  ['http', { labelKey: 'chat.timeline.actions.http', targetParams: ['url'] }],
  ['chat_list', { labelKey: 'chat.timeline.actions.chat_list' }],
  ['chat_read', { labelKey: 'chat.timeline.actions.chat_read' }],
  [
    'chat_grep',
    { labelKey: 'chat.timeline.actions.chat_grep', targetParams: ['pattern'] },
  ],
]);

export function getToolActionLabel(
  toolUse: ToolUseMessageContent,
  t: TFunction,
  toolCards: ToolCards = EMPTY_TOOL_CARDS,
): ToolActionLabel {
  const params = (toolUse.params as Record<string, unknown> | undefined) ?? {};
  const name = toolUse.name;
  const action = toolCards.get(name)?.action ?? textToolActions.get(name);

  if (action) {
    const list = action.listTargetParam
      ? asStringList(params[action.listTargetParam])
      : undefined;
    const target =
      list ?? firstString(action.targetParams?.map((key) => params[key]) ?? []);
    return { verb: t(action.labelKey), target };
  }

  const verb = t(`chat.tools.${name}`, {
    defaultValue: t('chat.timeline.actions.use_tool', {
      tool: formatToolName(name),
    }),
  });
  return { verb, target: firstString(Object.values(params)) };
}

function firstString(values: readonly unknown[]): string | undefined {
  for (const value of values) {
    const str = asString(value);
    if (str !== undefined) return str;
  }
  return undefined;
}
