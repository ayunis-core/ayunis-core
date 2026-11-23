import { useCallback } from 'react';
import { letterheadsControllerPreview } from '@ayunis/api-client/endpoints';
import type { LetterheadSampleDraft } from '@/features/letterhead-sample-preview/model/letterhead-sample-draft';

export function useLetterheadSample(
  draft: LetterheadSampleDraft,
  language: 'de' | 'en',
) {
  return useCallback(
    (signal: AbortSignal) =>
      letterheadsControllerPreview(
        {
          ...draft,
          language,
          fontFamily: draft.fontFamily === null ? '' : draft.fontFamily,
          fontSizePt:
            draft.fontSizePt === undefined
              ? undefined
              : String(draft.fontSizePt ?? ''),
          removeContinuationPage: draft.removeContinuationPage
            ? 'true'
            : undefined,
          firstPageMargins: JSON.stringify(draft.firstPageMargins),
          continuationPageMargins: JSON.stringify(
            draft.continuationPageMargins,
          ),
        },
        signal,
      ),
    [draft, language],
  );
}
