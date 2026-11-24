import { chatToolCards } from './tool-card-registrations';

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
