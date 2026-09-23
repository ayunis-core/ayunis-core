import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSourceCitation } from '@/pages/chat/api/useSourceCitation';
import SourceCitationDialog from './SourceCitationDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Readonly<Record<string, string | number>>) => {
      if (key === 'chat.sourceCitation.lines') {
        return `Lines ${values?.start}–${values?.end}`;
      }
      if (key === 'chat.sourceCitation.line') {
        return `Line ${values?.line}`;
      }
      return key;
    },
  }),
}));

vi.mock('@/pages/chat/api/useSourceCitation', () => ({
  useSourceCitation: vi.fn(),
}));

const threadId = '00000000-0000-0000-0000-000000000001';
const selectedCitation = {
  chunkId: '123e4567-e89b-12d3-a456-426614174000',
  label: 'Source 1',
};

function renderDialog() {
  return render(
    <SourceCitationDialog
      threadId={threadId}
      selectedCitation={selectedCitation}
      onClose={vi.fn()}
    />,
  );
}

describe('SourceCitationDialog', () => {
  it('opens immediately with a loading state', () => {
    vi.mocked(useSourceCitation).mockReturnValue({
      citation: null,
      isLoading: true,
      error: null,
    });

    renderDialog();

    const dialog = screen.getByTestId('source-citation-dialog');
    expect(dialog.className).toContain('max-h-[90vh]');
    expect(dialog.className).toContain('sm:max-w-3xl');
    expect(screen.getByText('chat.sourceCitation.loading')).toBeTruthy();
  });

  it('shows source metadata and only the cited excerpt without remote images', () => {
    vi.mocked(useSourceCitation).mockReturnValue({
      citation: {
        chunk: {
          id: selectedCitation.chunkId,
          content: 'Excerpt ![tracker](https://tracker.example/excerpt.png)',
          startLine: 3,
          endLine: 5,
        },
        source: {
          id: 'source-1',
          name: 'Policy.pdf',
          url: 'https://example.org/policy',
        },
      },
      isLoading: false,
      error: null,
    });

    renderDialog();

    expect(screen.getByRole('heading', { name: 'Policy.pdf' })).toBeTruthy();
    expect(screen.getByText('Lines 3–5')).toBeTruthy();
    expect(screen.getByTestId('source-citation-excerpt').className).toContain(
      'bg-brand/10',
    );
    expect(
      screen.getByTestId('source-citation-scroll-area').className,
    ).toContain('min-w-0');
    expect(screen.queryByTestId('source-citation-full-text')).toBeNull();
    expect(screen.queryByText(/Full text/)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://example.org/policy',
    );
  });

  it('shows a generic unavailable state for read errors', () => {
    vi.mocked(useSourceCitation).mockReturnValue({
      citation: null,
      isLoading: false,
      error: new Error('Forbidden'),
    });

    renderDialog();

    expect(screen.getByTestId('source-citation-error')).toBeTruthy();
    expect(screen.getByText('chat.sourceCitation.unavailable')).toBeTruthy();
  });

  it.each([
    // eslint-disable-next-line sonarjs/code-eval -- unsafe scheme is the behavior under test
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '/relative/source',
    'not a URL',
  ])('does not link an unsafe source URL: %s', (url) => {
    vi.mocked(useSourceCitation).mockReturnValue({
      citation: {
        chunk: {
          id: selectedCitation.chunkId,
          content: 'Excerpt',
          startLine: null,
          endLine: null,
        },
        source: { id: 'source-1', name: 'Source', url },
      },
      isLoading: false,
      error: null,
    });

    renderDialog();

    expect(screen.queryByRole('link')).toBeNull();
  });
});
