import { deanonymizeText } from 'src/common/anonymization/domain/deanonymize-text';
import type { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { mapContentText } from './map-content-text';

const MERMAID_TEXT_CHARACTER = /[\p{L}\p{N}\p{Zs}.,@+_-]/u;

/**
 * How the editors show a value in place of its placeholder, so resolved
 * content looks exactly as it did: HTML-escaped in documents, as Mermaid
 * entity codes (`#40;`) in diagrams wherever a character could be syntax,
 * and as it is in spreadsheet strings.
 */
const VALUE_ENCODINGS: Record<ArtifactType, (value: string) => string> = {
  [ArtifactType.DOCUMENT]: (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
  [ArtifactType.DIAGRAM]: (value) =>
    Array.from(value, (character) =>
      MERMAID_TEXT_CHARACTER.test(character)
        ? character
        : `#${character.codePointAt(0)};`,
    ).join(''),
  [ArtifactType.SPREADSHEET]: (value) => value,
};

/** The content with the dictionary's real values in place of its placeholders. */
export function resolveContentPlaceholders(
  type: ArtifactType,
  content: string,
  dictionary: readonly ArtifactPiiMask[],
): string {
  const encode = VALUE_ENCODINGS[type];
  const values = new Map(
    dictionary.map((mask) => [mask.token, encode(mask.value)]),
  );
  return mapContentText(type, content, (text) => deanonymizeText(text, values));
}

export function resolveTitlePlaceholders(
  title: string,
  dictionary: readonly ArtifactPiiMask[],
): string {
  return deanonymizeText(
    title,
    new Map(dictionary.map((mask) => [mask.token, mask.value])),
  );
}
