import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SourceCitationResponseDto } from '@ayunis/api-client/schemas';
import { PiiMaskProvider } from '@ayunis/chat/markdown';
import { SourceCitationDialog } from './source-citation-dialog';

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

const citationQuery = vi.hoisted(() => ({
  current: {} as {
    data?: SourceCitationResponseDto;
    isLoading: boolean;
    error: unknown;
  },
}));

vi.mock('@ayunis/api-client/endpoints', () => ({
  useThreadSourceCitationsControllerGetSourceCitation: () =>
    citationQuery.current,
}));

function useSourceCitation(state: {
  citation: unknown;
  isLoading: boolean;
  error: unknown;
}) {
  citationQuery.current = {
    data: (state.citation ?? undefined) as SourceCitationResponseDto,
    isLoading: state.isLoading,
    error: state.error,
  };
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => vi.unstubAllGlobals());

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
      events={{ onNewChat: vi.fn() }}
      onClose={vi.fn()}
    />,
  );
}

describe('SourceCitationDialog', () => {
  it('opens immediately with a loading state', () => {
    useSourceCitation({
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
    useSourceCitation({
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
        recording: null,
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
    useSourceCitation({
      citation: null,
      isLoading: false,
      error: new Error('Forbidden'),
    });

    renderDialog();

    expect(screen.getByTestId('source-citation-error')).toBeTruthy();
    expect(screen.getByText('chat.sourceCitation.unavailable')).toBeTruthy();
  });

  it('uses the surrounding chat PII context for cited excerpts', () => {
    const onUnmaskRequest = vi.fn();
    const mask = {
      id: 'mask-1',
      token: '{{pii:PERSON_1}}',
      value: 'Ada Lovelace',
      category: 'PERSON',
      unmasked: false,
    };
    useSourceCitation({
      citation: {
        chunk: {
          id: selectedCitation.chunkId,
          content: `Contact ${mask.token}`,
          startLine: null,
          endLine: null,
        },
        source: { id: 'source-1', name: 'Source', url: null },
        recording: null,
      },
      isLoading: false,
      error: null,
    });

    render(
      <PiiMaskProvider masks={[mask]} onUnmaskRequest={onUnmaskRequest}>
        <SourceCitationDialog
          threadId={threadId}
          selectedCitation={selectedCitation}
          events={{ onNewChat: vi.fn() }}
          onClose={vi.fn()}
        />
      </PiiMaskProvider>,
    );
    fireEvent.click(screen.getByTestId('pii-mask'));

    expect(onUnmaskRequest).toHaveBeenCalledWith(mask);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '/relative/source',
    'not a URL',
  ])('does not link an unsafe source URL: %s', (url) => {
    useSourceCitation({
      citation: {
        chunk: {
          id: selectedCitation.chunkId,
          content: 'Excerpt',
          startLine: null,
          endLine: null,
        },
        source: { id: 'source-1', name: 'Source', url },
        recording: null,
      },
      isLoading: false,
      error: null,
    });

    renderDialog();

    expect(screen.queryByRole('link')).toBeNull();
  });
});
