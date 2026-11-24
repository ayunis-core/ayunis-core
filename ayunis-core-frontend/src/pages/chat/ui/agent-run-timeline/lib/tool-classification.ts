import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';

import type { ArtifactFamily } from '@/pages/chat/ui/chat-widgets/artifact-tool-cards';
import { chatToolCards } from './tool-card-registrations';

export type { ArtifactFamily };

export function isRichTool(toolName: string): boolean {
  return chatToolCards.has(toolName);
}

/** The backend's `ToolType` values; every other name is an MCP tool. */
const BUILT_IN_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  'http',
  'source_query',
  'source_get_text',
  'knowledge_query',
  'knowledge_get_text',
  'recording_search',
  'internet_search',
  'website_content',
  'code_execution',
  'activate_skill',
  'marketplace_search',
  'get_memory',
  'set_memory',
  'chat_list',
  'chat_read',
  'chat_grep',
  'send_notification',
  'finish_routine',
  'outlook__read_email',
  'outlook__read_attachment',
  'outlook__save_email_to_draft',
]);

export type ToolUsageKind =
  | 'knowledge_base'
  | 'source'
  | 'internet_search'
  | 'skill'
  | 'integration'
  | 'artifact';

export function getToolUsageKind(toolName: string): ToolUsageKind | null {
  const card = chatToolCards.get(toolName);
  if (!card && !BUILT_IN_TOOL_NAMES.has(toolName)) return 'integration';
  if (toolName.startsWith('knowledge_')) return 'knowledge_base';
  if (toolName.startsWith('source_')) return 'source';
  if (toolName === 'internet_search' || toolName === 'website_content') {
    return 'internet_search';
  }
  if (toolName === 'activate_skill') return 'skill';
  if (card?.createsArtifact) return 'artifact';
  return null;
}

export interface ArtifactToolTarget {
  family: ArtifactFamily;
  artifactId: string;
}

export function getArtifactToolFamily(toolName: string): ArtifactFamily | null {
  return chatToolCards.get(toolName)?.artifactFamily ?? null;
}

/**
 * Identifies the artifact an operation targets, so repeated calls on
 * the same artifact can share one widget. Create tools are excluded: they
 * carry no artifact_id param and their widget shows the title, which the
 * mutation widgets cannot.
 */
export function getArtifactToolTarget(
  toolUse: ToolUseMessageContent,
): ArtifactToolTarget | null {
  const family = getArtifactToolFamily(toolUse.name);
  if (!family) return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- params may be undefined during streaming even if typed as required
  const params = (toolUse.params || {}) as { artifact_id?: unknown };
  const artifactId = params.artifact_id;
  if (typeof artifactId !== 'string' || artifactId.length === 0) return null;
  return { family, artifactId };
}
