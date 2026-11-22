import type { ArtifactResponseDto } from '@/shared/api';
import { resolvePiiTokens } from '@/widgets/markdown';

/** The title with an anonymous artifact's placeholders resolved, e.g. for file names. */
export function resolveArtifactTitle(
  artifact: Pick<ArtifactResponseDto, 'title' | 'piiMasks'>,
): string {
  const masks = new Map(
    (artifact.piiMasks ?? []).map((mask) => [mask.token, mask]),
  );
  return resolvePiiTokens(artifact.title, masks);
}
