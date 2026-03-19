import { useEffect, useRef, useCallback, useState } from 'react';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import type { PageMargins } from '@/shared/lib/letterhead-margins';

// pdfjs-dist setup with Vite-compatible worker import
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/** A PDF source — either a user-selected File or a remote URL. */
export type PdfSource = File | string | null;

interface MarginEditorProps {
  /** File object (new upload) or URL string (existing PDF). */
  pdfSource: PdfSource;
  margins: PageMargins;
  onMarginsChange: (margins: PageMargins) => void;
  label: string;
}

const CANVAS_MAX_WIDTH = 280;

/** Convert mm margins to canvas pixel offsets using actual PDF page dimensions. */
function marginsToCanvasPixels(
  margins: PageMargins,
  pdfWidthMm: number,
  pdfHeightMm: number,
  canvasWidth: number,
  canvasHeight: number,
): { top: number; right: number; bottom: number; left: number } {
  const scaleX = canvasWidth / pdfWidthMm;
  const scaleY = canvasHeight / pdfHeightMm;
  return {
    top: margins.top * scaleY,
    right: margins.right * scaleX,
    bottom: margins.bottom * scaleY,
    left: margins.left * scaleX,
  };
}

/** Draw the blue margin overlay on top of the rendered PDF page. */
function drawMarginOverlay(
  ctx: CanvasRenderingContext2D,
  margins: PageMargins,
  viewport: pdfjsLib.PageViewport,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const pdfWidthMm = viewport.width * 0.352778;
  const pdfHeightMm = viewport.height * 0.352778;

  const px = marginsToCanvasPixels(
    margins,
    pdfWidthMm,
    pdfHeightMm,
    canvasWidth,
    canvasHeight,
  );

  const contentX = px.left;
  const contentY = px.top;
  const contentW = canvasWidth - px.left - px.right;
  const contentH = canvasHeight - px.top - px.bottom;

  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.fillRect(contentX, contentY, contentW, contentH);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(contentX, contentY, contentW, contentH);
}

/** Returns true if the error is from a cancelled PDF.js render task. */
function isRenderCancelled(error: unknown): boolean {
  return error instanceof Error && error.message.includes('cancelled');
}

/** Load a PDF document from either a File or a URL. */
async function loadPdfDocument(
  source: File | string,
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (source instanceof File) {
    const arrayBuffer = await source.arrayBuffer();
    return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  }
  return pdfjsLib.getDocument({ url: source, withCredentials: true }).promise;
}

export function MarginEditor({
  pdfSource,
  margins,
  onMarginsChange,
  label,
}: Readonly<MarginEditorProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfPageRef = useRef<pdfjsLib.PDFPageProxy | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [pdfError, setPdfError] = useState(false);

  /** Render PDF preview onto the canvas. Throws on corrupt PDFs.
   *  @param isCurrent — returns false if this load has been superseded by a
   *  new file/render cycle, preventing stale writes to shared refs.
   */
  const renderPreview = useCallback(
    async (isCurrent: () => boolean) => {
      const canvas = canvasRef.current;
      if (!canvas || !pdfSource) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load the PDF page if not cached
      if (!pdfPageRef.current) {
        const pdf = await loadPdfDocument(pdfSource);

        // After every await, check whether a newer load has started
        if (!isCurrent()) {
          void pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        const page = await pdf.getPage(1);

        if (!isCurrent()) return;

        pdfPageRef.current = page;
      }

      const page = pdfPageRef.current;
      const viewport = page.getViewport({ scale: 1 });

      // Scale to fit CANVAS_MAX_WIDTH
      const scale = CANVAS_MAX_WIDTH / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Cancel any in-progress render before starting a new one
      renderTaskRef.current?.cancel();

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        canvas,
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      drawMarginOverlay(ctx, margins, viewport, canvas.width, canvas.height);
    },
    [pdfSource, margins],
  );

  // Clear cached page and destroy PDF document when source changes
  useEffect(() => {
    pdfPageRef.current = null;
    const previousDoc = pdfDocRef.current;
    pdfDocRef.current = null;

    return () => {
      void previousDoc?.destroy();
    };
  }, [pdfSource]);

  // Destroy PDF document on unmount
  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      void pdfDocRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCurrent = () => !cancelled;
    renderPreview(isCurrent)
      .then(() => {
        if (!cancelled) setPdfError(false);
      })
      .catch((error: unknown) => {
        if (cancelled || isRenderCancelled(error)) return;
        setPdfError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [renderPreview]);

  const handleChange = (field: keyof PageMargins, value: string) => {
    const num = Math.max(0, Number(value) || 0);
    onMarginsChange({ ...margins, [field]: num });
  };

  const hasPdfSource = pdfSource !== null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-4">
        {hasPdfSource && (
          <div className="shrink-0">
            {pdfError ? (
              <div
                className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
                style={{ maxWidth: CANVAS_MAX_WIDTH }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{t('letterheads.createDialog.pdfPreviewError')}</span>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="rounded border"
                style={{ maxWidth: CANVAS_MAX_WIDTH }}
              />
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(['top', 'bottom', 'left', 'right'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t(`letterheads.createDialog.${field}`)}
              </Label>
              <Input
                type="number"
                min={0}
                value={margins[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                className="h-8"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
