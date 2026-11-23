import { createMaskRegistry } from './apply-mask-replacements';
import { findPiiTokenRanges, replacePiiTokens } from './deanonymize-text';
import type { PiiMask } from './pii-mask';
import { formatPiiToken } from './pii-mask';

export interface PiiTokenTranslator {
  readonly translate: (text: string) => string;
  /** Tokens the source dictionary does not know; left in the text as they are. */
  readonly unknownTokens: ReadonlySet<string>;
  /** Target masks created for values the target dictionary had no token for. */
  readonly newMasks: PiiMask[];
}

/**
 * Translates `{{pii:…}}` tokens from one mask dictionary into another by
 * exact lookup, never by detection: a source token stands for its value, and
 * the value gets the target's token for it, or the next free one of its
 * category when the target has none.
 */
export function createPiiTokenTranslator(
  source: PiiMask[],
  target: PiiMask[],
): PiiTokenTranslator {
  const sourceByToken = byToken(source);
  const registry = createMaskRegistry(target);
  const unknownTokens = new Set<string>();
  const translate = (text: string) =>
    replacePiiTokens(text, (token) => {
      const mask = sourceByToken.get(token);
      if (!mask) {
        unknownTokens.add(token);
        return token;
      }
      return formatPiiToken(registry.resolve(mask.category, mask.value));
    });
  return { translate, unknownTokens, newMasks: registry.newMasks };
}

/** The masks of a dictionary whose tokens occur in any of the texts. */
export function findReferencedMasks(
  texts: string[],
  dictionary: PiiMask[],
): PiiMask[] {
  const dictionaryByToken = byToken(dictionary);
  const referenced = new Map<string, PiiMask>();
  for (const text of texts) {
    for (const { start, end } of findPiiTokenRanges(text)) {
      const token = text.slice(start, end);
      const mask = dictionaryByToken.get(token);
      if (mask) referenced.set(token, mask);
    }
  }
  return [...referenced.values()];
}

function byToken(masks: PiiMask[]): Map<string, PiiMask> {
  return new Map(masks.map((mask) => [formatPiiToken(mask), mask]));
}
