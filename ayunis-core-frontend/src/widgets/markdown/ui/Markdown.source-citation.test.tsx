import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';
import { SourceCitationProvider } from '@/widgets/markdown/model/source-citation-context';

const CHUNK_ID = '123e4567-e89b-12d3-a456-426614174000';
const MARKER = `{{source:${CHUNK_ID}|Quelle 1}}`;

vi.mock('./Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

describe('Markdown source citation rendering', () => {
  it('leaves source markers literal by default', () => {
    render(<Markdown>{MARKER}</Markdown>);

    expect(screen.getByText(MARKER)).toBeTruthy();
    expect(screen.queryByTestId('source-citation')).toBeNull();
  });

  it('renders a highlighted citation button and reports clicks', () => {
    const onCitationClick = vi.fn();
    render(
      <SourceCitationProvider onCitationClick={onCitationClick}>
        <Markdown renderSourceCitations>{MARKER}</Markdown>
      </SourceCitationProvider>,
    );

    const citation = screen.getByRole('button', { name: 'Quelle 1' });
    expect(citation.className).toContain('bg-muted');
    expect(citation.className).not.toContain('bg-brand');
    expect(citation.className).toContain('underline');
    expect(citation.getAttribute('data-source-chunk-id')).toBe(CHUNK_ID);

    fireEvent.click(citation);

    expect(onCitationClick).toHaveBeenCalledWith({
      chunkId: CHUNK_ID,
      label: 'Quelle 1',
    });
  });

  it.each(['Budget *draft*.pdf', 'Run `report` now'])(
    'renders Markdown syntax in a valid label literally: %s',
    (label) => {
      const onCitationClick = vi.fn();
      render(
        <SourceCitationProvider onCitationClick={onCitationClick}>
          <Markdown renderSourceCitations>
            {`{{source:${CHUNK_ID}|${label}}}`}
          </Markdown>
        </SourceCitationProvider>,
      );

      const citation = screen.getByRole('button', { name: label });
      expect(citation.textContent).toBe(label);

      fireEvent.click(citation);
      expect(onCitationClick).toHaveBeenCalledWith({
        chunkId: CHUNK_ID,
        label,
      });
    },
  );

  it('keeps a valid formatted-label marker literal inside fenced code', () => {
    const marker = `{{source:${CHUNK_ID}|Budget *draft*.pdf}}`;
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown
          renderSourceCitations
        >{`\`\`\`text\n${marker}\n\`\`\``}</Markdown>
      </SourceCitationProvider>,
    );

    expect(screen.getByText(marker)).toBeTruthy();
    expect(screen.queryByTestId('source-citation')).toBeNull();
  });

  it('renders the original marker when no citation callback is available', () => {
    render(<Markdown renderSourceCitations>{MARKER}</Markdown>);

    expect(screen.getByText(MARKER)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not render citations inside inline or fenced code', () => {
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown renderSourceCitations>
          {`Inline \`${MARKER}\`\n\n\`\`\`text\n${MARKER}\n\`\`\``}
        </Markdown>
      </SourceCitationProvider>,
    );

    expect(screen.getAllByText(MARKER)).toHaveLength(2);
    expect(screen.queryByTestId('source-citation')).toBeNull();
  });

  it('turns a completed streamed marker into a button on rerender', () => {
    const onCitationClick = vi.fn();
    const { rerender } = render(
      <SourceCitationProvider onCitationClick={onCitationClick}>
        <Markdown renderSourceCitations>
          {`{{source:${CHUNK_ID}|Quelle`}
        </Markdown>
      </SourceCitationProvider>,
    );

    expect(screen.queryByTestId('source-citation')).toBeNull();

    rerender(
      <SourceCitationProvider onCitationClick={onCitationClick}>
        <Markdown renderSourceCitations>{MARKER}</Markdown>
      </SourceCitationProvider>,
    );

    expect(screen.getByRole('button', { name: 'Quelle 1' })).toBeTruthy();
  });
});
