import type { DocumentTypography } from '@/shared/lib/document-typography';
import type { PageMargins } from '@/shared/lib/letterhead-margins';

export interface LetterheadSampleDraft extends Partial<DocumentTypography> {
  letterheadId?: string;
  firstPagePdf?: File;
  continuationPagePdf?: File;
  removeContinuationPage?: boolean;
  firstPageMargins: PageMargins;
  continuationPageMargins: PageMargins;
}
