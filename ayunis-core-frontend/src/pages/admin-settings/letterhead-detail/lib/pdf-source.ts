import config from '@/shared/config';
import type { PdfSource } from '@/widgets/margin-editor';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function buildPdfUrl(
  letterheadId: string,
  page: 'first' | 'continuation',
): string {
  const suffix = page === 'first' ? 'first-page-pdf' : 'continuation-page-pdf';
  return `${config.api.baseUrl}/letterheads/${letterheadId}/${suffix}`;
}

// eslint-disable-next-line sonarjs/function-return-type -- PdfSource is a union type by design
export function getContinuationPageSource(
  newFile: File | null,
  letterhead: LetterheadResponseDto,
  removeContinuation: boolean,
): PdfSource {
  if (newFile) return newFile;
  if (letterhead.hasContinuationPage && !removeContinuation) {
    return buildPdfUrl(letterhead.id, 'continuation');
  }
  return null;
}
