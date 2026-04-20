import { useCallback } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';

/**
 * Shared logic for the update-document and update-diagram chat widgets.
 * Both display an "updated"/"updating" status card linked to an existing
 * artifact by ID from the tool-use params; only the icon and i18n key prefix
 * differ between them.
 */
export function useUpdateArtifactWidget(
  content: ToolUseMessageContent,
  onOpenArtifact?: (artifactId: string) => void,
) {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming even if typed as required
  const params = (content.params || {}) as {
    artifact_id?: string;
    content?: string;
  };

  const artifactId = params.artifact_id ?? '';

  const handleOpen = useCallback(() => {
    if (artifactId && onOpenArtifact) {
      onOpenArtifact(artifactId);
    }
  }, [artifactId, onOpenArtifact]);

  return { artifactId, handleOpen };
}
