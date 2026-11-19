import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type LoadPdf = (signal: AbortSignal) => Promise<Blob>;

export function usePdfDocument(load: LoadPdf) {
  const [result, setResult] = useState<{
    load: LoadPdf;
    pdf: PDFDocumentProxy | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let task: ReturnType<typeof getDocument> | undefined;

    async function loadDocument() {
      try {
        const data = await (await load(signal)).arrayBuffer();
        signal.throwIfAborted();
        task = getDocument({ data });
        const pdf = await task.promise;
        signal.throwIfAborted();
        setResult({ load, pdf });
      } catch {
        if (!signal.aborted) setResult({ load, pdf: null });
      }
    }

    void loadDocument();
    return () => {
      controller.abort();
      void task?.destroy();
    };
  }, [load]);

  return {
    pdf: result?.load === load ? result.pdf : null,
    failed: result?.load === load && result.pdf === null,
  };
}

export function usePdfPageCanvas(pdf: PDFDocumentProxy, pageNumber: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    const { signal } = controller;
    let cancelRender: (() => void) | undefined;

    async function renderPage(target: HTMLCanvasElement) {
      try {
        const page = await pdf.getPage(pageNumber);
        signal.throwIfAborted();
        const viewport = page.getViewport({ scale: 1.5 });
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        const render = page.render({ canvas: target, viewport });
        cancelRender = () => render.cancel();
        await render.promise;
        signal.throwIfAborted();
        setStatus('ready');
      } catch {
        if (!signal.aborted) setStatus('error');
      }
    }

    void renderPage(canvas);
    return () => {
      controller.abort();
      cancelRender?.();
    };
  }, [pageNumber, pdf]);

  return { canvasRef, status };
}
