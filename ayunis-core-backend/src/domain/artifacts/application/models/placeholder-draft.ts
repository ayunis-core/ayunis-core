import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';

/**
 * Text of an anonymous artifact that still has to be numbered against the
 * artifact's mask dictionary: given the dictionary, it returns the text in
 * the artifact's placeholders and the entries the dictionary needs added.
 */
export type PlaceholderDraft<T = string> = (dictionary: PiiMask[]) => {
  value: T;
  newMasks: PiiMask[];
};

/** Numbers two drafts one after the other against the same dictionary. */
export function combineDrafts<A, B>(
  first: PlaceholderDraft<A>,
  second: PlaceholderDraft<B>,
): PlaceholderDraft<[A, B]> {
  return (dictionary) => {
    const a = first(dictionary);
    const b = second([...dictionary, ...a.newMasks]);
    return {
      value: [a.value, b.value],
      newMasks: [...a.newMasks, ...b.newMasks],
    };
  };
}
