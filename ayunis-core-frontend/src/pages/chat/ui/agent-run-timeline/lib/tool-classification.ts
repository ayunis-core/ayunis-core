import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';

const RICH_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  'create_file',
  'create_document',
  'update_document',
  'edit_document',
  'read_document',
  'create_diagram',
  'update_diagram',
  'create_spreadsheet',
  'update_spreadsheet',
  'bar_chart',
  'line_chart',
  'pie_chart',
  'map',
  'generate_image',
  'send_email',
  'create_calendar_event',
  'create_skill',
  'edit_skill',
  'install_marketplace_skill',
  'create_routine',
  'edit_routine',
]);

export function isRichTool(toolName: string): boolean {
  return RICH_TOOL_NAMES.has(toolName);
}

/** The backend's `ToolType` values; every other name is an MCP tool. */
const BUILT_IN_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  ...RICH_TOOL_NAMES,
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
  'send_notification',
  'finish_routine',
]);

const ARTIFACT_CREATION_TOOLS: ReadonlySet<string> = new Set<string>([
  'create_document',
  'create_spreadsheet',
  'create_diagram',
  'create_file',
  'bar_chart',
  'line_chart',
  'pie_chart',
  'generate_image',
]);

export type ToolUsageKind =
  | 'knowledge_base'
  | 'source'
  | 'internet_search'
  | 'skill'
  | 'integration'
  | 'artifact';

export function getToolUsageKind(toolName: string): ToolUsageKind | null {
  if (!BUILT_IN_TOOL_NAMES.has(toolName)) return 'integration';
  if (toolName.startsWith('knowledge_')) return 'knowledge_base';
  if (toolName.startsWith('source_')) return 'source';
  if (toolName === 'internet_search' || toolName === 'website_content') {
    return 'internet_search';
  }
  if (toolName === 'activate_skill') return 'skill';
  if (ARTIFACT_CREATION_TOOLS.has(toolName)) return 'artifact';
  return null;
}

const ARTIFACT_TARGET_TOOLS: ReadonlyMap<string, ArtifactFamily> = new Map([
  ['edit_document', 'document'],
  ['read_document', 'document'],
  ['update_document', 'document'],
  ['update_diagram', 'diagram'],
  ['update_spreadsheet', 'spreadsheet'],
]);

export type ArtifactFamily = 'document' | 'diagram' | 'spreadsheet';

export interface ArtifactToolTarget {
  family: ArtifactFamily;
  artifactId: string;
}

export function getArtifactToolFamily(toolName: string): ArtifactFamily | null {
  return ARTIFACT_TARGET_TOOLS.get(toolName) ?? null;
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
