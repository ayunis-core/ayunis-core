import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument,
}));
vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
  default: 'worker.mjs',
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { MarginEditor } from './MarginEditor';

const MARGINS = { top: 45, bottom: 25, left: 25, right: 20 };

// jsdom has no canvas backend; without a context the component errors out
// before it ever reaches pdf.js and the tests below would pass vacuously.
const ctx = {
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  setLineDash: vi.fn(),
  clearRect: vi.fn(),
} as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
});

/** A pdf.js document stub whose single page renders successfully. */
function workingPdf() {
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({
      width: 595 * scale,
      height: 842 * scale,
    }),
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
  };
  return {
    promise: Promise.resolve({
      getPage: () => Promise.resolve(page),
      destroy: vi.fn(),
    }),
  };
}

function renderEditor(
  pdfSource: File | string | null = '/api/letterheads/abc/first-page-pdf',
) {
  return render(
    <MarginEditor
      pdfSource={pdfSource}
      margins={MARGINS}
      onMarginsChange={vi.fn()}
      label="First page"
    />,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('MarginEditor preview feedback', () => {
  it('shows the loading state while pdf.js has not resolved', () => {
    getDocument.mockReturnValue({ promise: new Promise(() => {}) });

    renderEditor();

    expect(
      screen.getByText('letterheads.createDialog.pdfPreviewLoading'),
    ).toBeTruthy();
    // The canvas must stay mounted so renderPreview always has a ref to draw into.
    expect(document.querySelector('canvas')).toBeTruthy();
  });

  it('returns to loading when a PDF is selected in the create flow', async () => {
    getDocument.mockReturnValue({ promise: new Promise(() => {}) });

    // Starts with no PDF at all, as the create dialog does.
    const { rerender } = renderEditor(null);
    await waitFor(() =>
      expect(
        screen.queryByText('letterheads.createDialog.pdfPreviewLoading'),
      ).toBe(null),
    );

    rerender(
      <MarginEditor
        pdfSource={new File(['%PDF-'], 'letterhead.pdf')}
        margins={MARGINS}
        onMarginsChange={vi.fn()}
        label="First page"
      />,
    );

    expect(
      screen.getByText('letterheads.createDialog.pdfPreviewLoading'),
    ).toBeTruthy();
  });

  it('does not flicker back to loading when only the margins change', async () => {
    getDocument.mockReturnValue({ promise: new Promise(() => {}) });

    const { rerender } = renderEditor(null);
    await waitFor(() =>
      expect(
        screen.queryByText('letterheads.createDialog.pdfPreviewLoading'),
      ).toBe(null),
    );

    rerender(
      <MarginEditor
        pdfSource={null}
        margins={{ ...MARGINS, top: 46 }}
        onMarginsChange={vi.fn()}
        label="First page"
      />,
    );

    expect(
      screen.queryByText('letterheads.createDialog.pdfPreviewLoading'),
    ).toBe(null);
  });

  // The error branch used to unmount the canvas, so the retry ran with a null
  // ref, returned silently, and cleared the error onto a blank canvas that was
  // never sized again. Reachable in the create dialog, where the File is local
  // and unvalidated: pick a corrupt PDF, then pick a good one.
  it('recovers when a good PDF replaces one that failed to load', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('corrupt')),
    }));

    const { rerender } = renderEditor(new File(['bad'], 'broken.pdf'));
    await waitFor(() =>
      expect(
        screen.getByText('letterheads.createDialog.pdfPreviewError'),
      ).toBeTruthy(),
    );

    getDocument.mockImplementation(() => workingPdf());
    rerender(
      <MarginEditor
        pdfSource={new File(['%PDF-'], 'good.pdf')}
        margins={MARGINS}
        onMarginsChange={vi.fn()}
        label="First page"
      />,
    );

    await waitFor(() =>
      expect(
        screen.queryByText('letterheads.createDialog.pdfPreviewError'),
      ).toBe(null),
    );
    // Sized by renderPreview — proves it actually drew, not just cleared.
    await waitFor(() =>
      expect(document.querySelector('canvas')?.width).toBe(280),
    );
  });

  // The overlays are translucent and the canvas now stays mounted, so without
  // an explicit clear the previous letterhead stays visible underneath while a
  // replacement loads or fails — a preview that contradicts the chosen file.
  it('clears the old artwork when the PDF is replaced', async () => {
    getDocument.mockImplementation(() => workingPdf());

    const { rerender } = renderEditor(new File(['%PDF-'], 'first.pdf'));
    await waitFor(() =>
      expect(document.querySelector('canvas')?.width).toBe(280),
    );
    vi.mocked(ctx.clearRect).mockClear();

    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('corrupt')),
    }));
    rerender(
      <MarginEditor
        pdfSource={new File(['bad'], 'broken.pdf')}
        margins={MARGINS}
        onMarginsChange={vi.fn()}
        label="First page"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText('letterheads.createDialog.pdfPreviewError'),
      ).toBeTruthy(),
    );
    // jsdom has no bitmap to inspect, so the clear call is the observable
    // contract at this layer.
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 280, 396);
  });

  // A settle is filed under the source it describes, so a load that has been
  // replaced cannot report 'ready' for the file that replaced it. Uses URL
  // sources: the File path awaits arrayBuffer() before calling getDocument.
  it('ignores a settle from a source that has been replaced', async () => {
    let finishFirst!: (doc: unknown) => void;
    getDocument.mockImplementation(() => ({
      promise: new Promise((resolve) => {
        finishFirst = resolve;
      }),
    }));

    const { rerender } = renderEditor('/api/letterheads/first/first-page-pdf');
    expect(
      screen.getByText('letterheads.createDialog.pdfPreviewLoading'),
    ).toBeTruthy();

    getDocument.mockImplementation(() => ({ promise: new Promise(() => {}) }));
    rerender(
      <MarginEditor
        pdfSource="/api/letterheads/second/first-page-pdf"
        margins={MARGINS}
        onMarginsChange={vi.fn()}
        label="First page"
      />,
    );

    // The first load lands late. It must not clear the second source's overlay.
    await act(async () => {
      finishFirst({
        getPage: () =>
          Promise.resolve({
            getViewport: ({ scale }: { scale: number }) => ({
              width: 595 * scale,
              height: 842 * scale,
            }),
            render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
          }),
        destroy: vi.fn(),
      });
    });

    expect(
      screen.getByText('letterheads.createDialog.pdfPreviewLoading'),
    ).toBeTruthy();
  });

  it('falls back to the error state when pdf.js never settles', async () => {
    vi.useFakeTimers();
    getDocument.mockReturnValue({ promise: new Promise(() => {}) });

    renderEditor();

    await act(() => vi.advanceTimersByTimeAsync(14_000));
    expect(screen.queryByText('letterheads.createDialog.pdfPreviewError')).toBe(
      null,
    );

    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(
      screen.getByText('letterheads.createDialog.pdfPreviewError'),
    ).toBeTruthy();
  });

  it('shows the error state when the PDF cannot be loaded', async () => {
    getDocument.mockImplementation(() => ({
      promise: Promise.reject(new Error('boom')),
    }));

    renderEditor();

    await waitFor(() =>
      expect(
        screen.getByText('letterheads.createDialog.pdfPreviewError'),
      ).toBeTruthy(),
    );
  });
});
