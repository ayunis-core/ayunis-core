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
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as CanvasRenderingContext2D,
  );
});

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
