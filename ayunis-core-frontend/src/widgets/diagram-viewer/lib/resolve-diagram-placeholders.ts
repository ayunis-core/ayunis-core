import type { ArtifactPiiMaskResponseDto } from '@/shared/api';
import { resolvePiiTokens } from '@/widgets/markdown';

const MERMAID_TEXT_CHARACTER = /[\p{L}\p{N}\p{Zs}.,@+_-]/u;

/** Mermaid entity codes (`#35;`) for every character that could be syntax. */
const escapeMermaid = (value: string) =>
  Array.from(value, (character) =>
    MERMAID_TEXT_CHARACTER.test(character)
      ? character
      : `#${character.codePointAt(0)};`,
  ).join('');

/**
 * The diagram's Mermaid source with the real values of an anonymous
 * artifact's own dictionary in place of its placeholders, so the diagram is
 * laid out around them. Values are entity-encoded, so a quote or a bracket
 * in a value cannot end a label.
 */
export function resolveDiagramPlaceholders(
  source: string,
  piiMasks: readonly ArtifactPiiMaskResponseDto[] = [],
): string {
  if (piiMasks.length === 0) return source;
  const values = new Map(
    piiMasks.map((mask) => [mask.token, { value: escapeMermaid(mask.value) }]),
  );
  return resolvePiiTokens(source, values);
}
