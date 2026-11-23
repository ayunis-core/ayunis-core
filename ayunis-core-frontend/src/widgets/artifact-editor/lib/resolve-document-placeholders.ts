import type { ArtifactPiiMaskResponseDto } from '@/shared/api';
import { resolvePiiTokens } from '@/widgets/markdown';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The document's HTML with the real values of an anonymous artifact's own
 * dictionary in place of its placeholders, escaped so a value can never turn
 * into markup. Saving it back lets the backend restore the placeholders of
 * every value left unchanged.
 */
export function resolveDocumentPlaceholders(
  html: string,
  piiMasks: readonly ArtifactPiiMaskResponseDto[] = [],
): string {
  if (piiMasks.length === 0) return html;
  const values = new Map(
    piiMasks.map((mask) => [mask.token, { value: escapeHtml(mask.value) }]),
  );
  return resolvePiiTokens(html, values);
}
