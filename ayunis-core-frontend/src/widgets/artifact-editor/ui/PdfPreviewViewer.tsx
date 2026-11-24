import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { artifactsControllerExport } from '@ayunis/api-client';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { usePdfDocument, usePdfPageCanvas } from '@/shared/lib/pdf-preview';

interface PdfPreviewViewerProps {
  readonly artifactId: string;
  readonly versionNumber: number;
}

export default function PdfPreviewViewer({
  artifactId,
  versionNumber,
}: PdfPreviewViewerProps) {
  const { t } = useTranslation('artifacts');
  const load = useCallback(
    (signal: AbortSignal) =>
      artifactsControllerExport(
        artifactId,
        { format: 'pdf', versionNumber },
        signal,
      ),
    [artifactId, versionNumber],
  );
  const { pdf, failed } = usePdfDocument(load);

  if (failed) return <p role="alert">{t('preview.failed')}</p>;
  if (!pdf) return <p role="status">{t('preview.loading')}</p>;
  return <PdfPreviewPages pdf={pdf} />;
}

function PdfPreviewPages({ pdf }: Readonly<{ pdf: PDFDocumentProxy }>) {
  const { t } = useTranslation('artifacts');
  const [page, setPage] = useState(1);
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <PdfPreviewPage key={page} pdf={pdf} page={page} />
      {pdf.numPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label={t('preview.previousPage')}
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm">
            {t('preview.pageCount', { page, total: pdf.numPages })}
          </span>
          <Button
            size="icon"
            variant="outline"
            aria-label={t('preview.nextPage')}
            disabled={page >= pdf.numPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PdfPreviewPage({
  pdf,
  page,
}: Readonly<{ pdf: PDFDocumentProxy; page: number }>) {
  const { t } = useTranslation('artifacts');
  const { canvasRef, status } = usePdfPageCanvas(pdf, page);

  return (
    <div
      className="bg-muted min-h-32 overflow-auto rounded border"
      aria-busy={status === 'loading'}
    >
      {status === 'loading' && (
        <p className="p-4" role="status">
          {t('preview.loading')}
        </p>
      )}
      {status === 'error' && (
        <p className="p-4" role="alert">
          {t('preview.failed')}
        </p>
      )}
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('preview.pageCount', { page, total: pdf.numPages })}
        className="h-auto w-full"
        hidden={status !== 'ready'}
        data-testid="artifact-pdf-preview-page"
      />
    </div>
  );
}
