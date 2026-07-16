import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';

const RICH_TOOL_NAMES: ReadonlySet<string> = new Set<string>([
  'create_document',
  'update_document',
  'edit_document',
  'create_diagram',
  'update_diagram',
  'create_spreadsheet',
  'update_spreadsheet',
  'bar_chart',
  'line_chart',
  'pie_chart',
  'generate_image',
  'send_email',
  'create_calendar_event',
  'create_skill',
  'edit_skill',
]);

export function isRichTool(toolName: string): boolean {
  return RICH_TOOL_NAMES.has(toolName);
}

const ARTIFACT_MUTATION_TOOLS: ReadonlyMap<string, ArtifactFamily> = new Map([
  ['edit_document', 'document'],
  ['update_document', 'document'],
  ['update_diagram', 'diagram'],
  ['update_spreadsheet', 'spreadsheet'],
]);

export type ArtifactFamily = 'document' | 'diagram' | 'spreadsheet';

export interface ArtifactToolTarget {
  family: ArtifactFamily;
  artifactId: string;
}

export function getArtifactMutationFamily(
  toolName: string,
): ArtifactFamily | null {
  return ARTIFACT_MUTATION_TOOLS.get(toolName) ?? null;
}

/**
 * Identifies the artifact a mutation tool call targets, so repeated calls on
 * the same artifact can share one widget. Create tools are excluded: they
 * carry no artifact_id param and their widget shows the title, which the
 * mutation widgets cannot.
 */
export function getArtifactToolTarget(
  toolUse: ToolUseMessageContent,
): ArtifactToolTarget | null {
  const family = getArtifactMutationFamily(toolUse.name);
  if (!family) return null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- params may be undefined during streaming even if typed as required
  const params = (toolUse.params || {}) as { artifact_id?: unknown };
  const artifactId = params.artifact_id;
  if (typeof artifactId !== 'string' || artifactId.length === 0) return null;
  return { family, artifactId };
}
