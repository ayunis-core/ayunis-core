import {
  useDocumentDefaultsControllerFind,
  useLetterheadsControllerFindOne,
} from '@ayunis/api-client/endpoints';
import { DOCUMENT_FONT_STACKS } from '@/shared/lib/document-typography';

export function useDocumentTypography(letterheadId: string | null | undefined) {
  const { data: defaults } = useDocumentDefaultsControllerFind();
  const { data: letterhead } = useLetterheadsControllerFindOne(
    letterheadId ?? '',
    {
      query: { enabled: Boolean(letterheadId), retry: false },
    },
  );
  const fontFamily = letterhead?.fontFamily ?? defaults?.fontFamily;
  const fontSizePt = letterhead?.fontSizePt ?? defaults?.fontSizePt;

  return {
    fontFamily: fontFamily ? DOCUMENT_FONT_STACKS[fontFamily] : undefined,
    fontSize: typeof fontSizePt === 'number' ? `${fontSizePt}pt` : undefined,
  };
}
