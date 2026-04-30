import type { TFunction } from 'i18next';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { formatToolName } from '@/pages/chat/lib/format-tool-name';

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

export function getToolActionLabel(
  toolUse: ToolUseMessageContent,
  t: TFunction,
): ToolActionLabel {
  const params = (toolUse.params as Record<string, unknown> | undefined) ?? {};
  const name = toolUse.name;

  switch (name) {
    case ToolAssignmentDtoType.create_document:
      return {
        verb: t('chat.timeline.actions.create_document'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.update_document:
      return {
        verb: t('chat.timeline.actions.update_document'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.edit_document:
      return {
        verb: t('chat.timeline.actions.edit_document'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.read_document:
      return {
        verb: t('chat.timeline.actions.read_document'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.create_diagram:
      return {
        verb: t('chat.timeline.actions.create_diagram'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.update_diagram:
      return {
        verb: t('chat.timeline.actions.update_diagram'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.bar_chart:
    case ToolAssignmentDtoType.line_chart:
    case ToolAssignmentDtoType.pie_chart:
      return {
        verb: t('chat.timeline.actions.chart'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.generate_image:
      return {
        verb: t('chat.timeline.actions.generate_image'),
        target: asString(params.prompt),
      };
    case ToolAssignmentDtoType.send_email:
      return {
        verb: t('chat.timeline.actions.send_email'),
        target: asString(params.subject) ?? asString(params.to),
      };
    case ToolAssignmentDtoType.create_calendar_event:
      return {
        verb: t('chat.timeline.actions.create_calendar_event'),
        target: asString(params.title),
      };
    case ToolAssignmentDtoType.create_skill:
      return {
        verb: t('chat.timeline.actions.create_skill'),
        target: asString(params.name),
      };
    case ToolAssignmentDtoType.edit_skill:
      return {
        verb: t('chat.timeline.actions.edit_skill'),
        target: asString(params.name),
      };
    case ToolAssignmentDtoType.activate_skill:
      return {
        verb: t('chat.timeline.actions.activate_skill'),
        target: asString(params.name),
      };
    case ToolAssignmentDtoType.internet_search:
      return {
        verb: t('chat.timeline.actions.internet_search'),
        target: asString(params.query),
      };
    case ToolAssignmentDtoType.website_content:
      return {
        verb: t('chat.timeline.actions.website_content'),
        target: asString(params.url),
      };
    case ToolAssignmentDtoType.source_query:
    case ToolAssignmentDtoType.source_get_text:
      return {
        verb: t('chat.timeline.actions.source_query'),
        target: asString(params.query),
      };
    case ToolAssignmentDtoType.knowledge_query:
    case ToolAssignmentDtoType.knowledge_get_text:
      return {
        verb: t('chat.timeline.actions.knowledge_query'),
        target: asString(params.query),
      };
    case ToolAssignmentDtoType.code_execution:
      return { verb: t('chat.timeline.actions.code_execution') };
    case ToolAssignmentDtoType.http:
      return {
        verb: t('chat.timeline.actions.http'),
        target: asString(params.url),
      };
    default: {
      // MCP tool / unknown: fall back to formatted tool name + first scalar param
      const verb = t(`chat.tools.${name}`, {
        defaultValue: t('chat.timeline.actions.use_tool', {
          tool: formatToolName(name),
        }),
      });
      const target = pickFirstScalarParam(params);
      return { verb, target };
    }
  }
}

function pickFirstScalarParam(
  params: Record<string, unknown>,
): string | undefined {
  for (const value of Object.values(params)) {
    const str = asString(value);
    if (str !== undefined) return str;
  }
  return undefined;
}
