import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';

const RICH_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
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
]);

export function isRichTool(toolName: string): boolean {
  return RICH_TOOL_NAMES.has(toolName);
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
