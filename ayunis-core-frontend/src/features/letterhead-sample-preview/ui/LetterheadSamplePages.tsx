import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useTranslation } from 'react-i18next';
import { useLetterheadSample } from '@/features/letterhead-sample-preview/api/useLetterheadSample';
import type { LetterheadSampleDraft } from '@/features/letterhead-sample-preview/model/letterhead-sample-draft';
import { usePdfDocument, usePdfPageCanvas } from '@/shared/lib/pdf-preview';

export default function LetterheadSamplePages({
  draft,
}: Readonly<{ draft: LetterheadSampleDraft }>) {
  const { t, i18n } = useTranslation('admin-settings-letterheads');
  const language = i18n.resolvedLanguage?.startsWith('de') ? 'de' : 'en';
  const load = useLetterheadSample(draft, language);
  const { pdf, failed } = usePdfDocument(load);

  if (failed)
    return <p role="alert">{t('letterheads.samplePreview.failed')}</p>;
  if (!pdf)
    return <p role="status">{t('letterheads.samplePreview.loading')}</p>;
  return (
    <div className="grid min-h-0 content-start gap-4 overflow-auto sm:grid-cols-2">
      <SamplePage
        pdf={pdf}
        pageNumber={1}
        label={t('letterheads.detail.firstPage')}
        testId="letterhead-sample-preview-first"
      />
      <SamplePage
        pdf={pdf}
        pageNumber={2}
        label={t('letterheads.detail.followingPages')}
        testId="letterhead-sample-preview-continuation"
      />
    </div>
  );
}

interface SamplePageProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  label: string;
  testId: string;
}

function SamplePage({
  pdf,
  pageNumber,
  label,
  testId,
}: Readonly<SamplePageProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const { canvasRef, status } = usePdfPageCanvas(pdf, pageNumber);

  return (
    <figure className="min-w-0 space-y-2">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      <div
        className="bg-muted min-h-32 rounded border"
        aria-busy={status === 'loading'}
      >
        {status === 'loading' && (
          <p className="p-4" role="status">
            {t('letterheads.samplePreview.loading')}
          </p>
        )}
        {status === 'error' && (
          <p className="p-4" role="alert">
            {t('letterheads.samplePreview.failed')}
          </p>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          hidden={status !== 'ready'}
          className="h-auto w-full"
          data-testid={testId}
        />
      </div>
    </figure>
  );
}
