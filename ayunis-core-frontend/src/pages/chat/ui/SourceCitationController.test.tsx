import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Markdown } from '@/widgets/markdown';
import { useSourceCitation } from '@/pages/chat/api/useSourceCitation';
import SourceCitationController from './SourceCitationController';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/pages/chat/api/useSourceCitation', () => ({
  useSourceCitation: vi.fn(() => ({
    citation: null,
    isLoading: true,
    error: null,
  })),
}));

const threadId = '00000000-0000-0000-0000-000000000001';
const chunkId = '123e4567-e89b-12d3-a456-426614174000';

describe('SourceCitationController', () => {
  it('creates the citation query only after an assistant citation is selected', () => {
    render(
      <SourceCitationController threadId={threadId}>
        <Markdown renderSourceCitations>
          {`Answer {{source:${chunkId}|Source 1}}`}
        </Markdown>
      </SourceCitationController>,
    );

    expect(useSourceCitation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Source 1' }));

    expect(useSourceCitation).toHaveBeenCalledWith(threadId, chunkId);
    expect(screen.getByTestId('source-citation-dialog')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'chat.sourceCitation.close' }),
    );

    expect(screen.queryByTestId('source-citation-dialog')).toBeNull();
  });
});
