import type { ToolUseMessageContentResponseDto as ToolUseMessageContent } from '@ayunis/api-client/schemas';
import type { ToolCards } from './tool-card-types';

export interface ArtifactToolTarget {
  family: string;
  artifactId: string;
}

export function getArtifactToolFamily(
  toolCards: ToolCards,
  toolName: string,
): string | null {
  return toolCards.get(toolName)?.artifactFamily ?? null;
}

/**
 * Identifies the artifact an operation targets, so repeated calls on
 * the same artifact can share one widget. Create tools are excluded: they
 * carry no artifact_id param and their widget shows the title, which the
 * mutation widgets cannot.
 */
export function getArtifactToolTarget(
  toolCards: ToolCards,
  toolUse: ToolUseMessageContent,
): ArtifactToolTarget | null {
  const family = getArtifactToolFamily(toolCards, toolUse.name);
  if (!family) return null;
  // Tool arguments may be absent while they are still streaming.
  const params = (toolUse.params || {}) as { artifact_id?: unknown };
  const artifactId = params.artifact_id;
  if (typeof artifactId !== 'string' || artifactId.length === 0) return null;
  return { family, artifactId };
}
