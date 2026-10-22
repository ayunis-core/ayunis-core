import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';
import { SourceCitationProvider } from '@/widgets/markdown/model/source-citation-context';

const CHUNK_ID = '123e4567-e89b-12d3-a456-426614174000';
const MARKER = `{{source:${CHUNK_ID}|Quelle 1}}`;

function tableWithCitation(marker: string): string {
  return `| Abschnitt | Beleg | Seite |\n| --- | --- | --- |\n| Haushalt | ${marker} | 1 / 3 |\n| Folge | unverändert | 2 / 3 |`;
}

vi.mock('./Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

describe('Markdown source citation rendering', () => {
  it('renders multiple table citations and keeps formatted labels literal', () => {
    const secondId = '89217653-8673-4eb7-a962-77eec152d83e';
    const label = 'Budget *draft* `report`';
    const onCitationClick = vi.fn();
    render(
      <SourceCitationProvider onCitationClick={onCitationClick}>
        <Markdown renderSourceCitations>
          {tableWithCitation(`${MARKER} und {{source:${secondId}\\|${label}}}`)}
        </Markdown>
      </SourceCitationProvider>,
    );
    const citations = screen.getAllByRole('button');
    expect(citations.map((button) => button.textContent)).toEqual([
      'Quelle 1',
      label,
    ]);
    fireEvent.click(citations[1]);
    expect(onCitationClick).toHaveBeenCalledWith({ chunkId: secondId, label });
    expect(screen.getAllByRole('cell')).toHaveLength(6);
  });

  it('renders citations in table headers and separate cells', () => {
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown renderSourceCitations>
          {`| ${MARKER} | Beleg |\n| --- | --- |\n| ${MARKER} | ${MARKER} |`}
        </Markdown>
      </SourceCitationProvider>,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getAllByRole('cell')).toHaveLength(2);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('preserves link labels, destinations and image alt text containing markers', () => {
    const url = `https://example.com/{{source:${CHUNK_ID}|Quelle}}`;
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown renderSourceCitations>
          {`[${MARKER}](${url})\n\n![${MARKER}](${url})\n\n${tableWithCitation(MARKER)}`}
        </Markdown>
      </SourceCitationProvider>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('link').textContent).toBe(MARKER);
    expect(screen.getByRole('link').getAttribute('href')).toContain('|Quelle');
    expect(screen.getByRole('img').getAttribute('alt')).toBe(MARKER);
    expect(screen.getByRole('img').getAttribute('src')).toContain('|Quelle');
  });

  it('preserves private-use characters and numeric entities alongside citations', () => {
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown renderSourceCitations>
          {`Literal \uE000 entity &#xE000; decimal &#57344;\n\n${tableWithCitation(MARKER)}`}
        </Markdown>
      </SourceCitationProvider>,
    );
    expect(
      screen.getByText('Literal \uE000 entity \uE000 decimal \uE000'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quelle 1' })).toBeTruthy();
  });

  it.each(['|', '\\|'])(
    'keeps table code literal with separator %s',
    (separator) => {
      const marker = `{{source:${CHUNK_ID}${separator}Quelle 1}}`;
      const table = tableWithCitation(`\`${marker}\``);
      render(
        <SourceCitationProvider onCitationClick={vi.fn()}>
          <Markdown renderSourceCitations>
            {`${table}\n\n\`\`\`text\n${marker}\n\`\`\``}
          </Markdown>
        </SourceCitationProvider>,
      );
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.getAllByText(MARKER)).toHaveLength(
        separator === '|' ? 2 : 1,
      );
      expect(screen.getAllByRole('cell')).toHaveLength(6);
    },
  );

  it('keeps full table markers when no callback is available', () => {
    render(
      <Markdown renderSourceCitations>{tableWithCitation(MARKER)}</Markdown>,
    );
    expect(screen.getByText(MARKER)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('cell')).toHaveLength(6);
  });

  it.each(['|', '\\|'])(
    'renders table citations with separator %s',
    (separator) => {
      const onCitationClick = vi.fn();
      render(
        <SourceCitationProvider onCitationClick={onCitationClick}>
          <Markdown renderSourceCitations>
            {tableWithCitation(`{{source:${CHUNK_ID}${separator}Haushalt}}`)}
          </Markdown>
        </SourceCitationProvider>,
      );
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3);
      const cells = within(rows[1]).getAllByRole('cell');
      expect(cells.map((cell) => cell.textContent)).toEqual([
        'Haushalt',
        'Haushalt',
        '1 / 3',
      ]);
      fireEvent.click(
        within(cells[1]).getByRole('button', { name: 'Haushalt' }),
      );
      expect(onCitationClick).toHaveBeenCalledWith({
        chunkId: CHUNK_ID,
        label: 'Haushalt',
      });
      expect(
        within(rows[2])
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ).toEqual(['Folge', 'unverändert', '2 / 3']);
    },
  );

  it.each(['|', '\\|'])(
    'completes streamed table citations with separator %s',
    (separator) => {
      const content = (marker: string) => (
        <SourceCitationProvider onCitationClick={vi.fn()}>
          <Markdown renderSourceCitations>{tableWithCitation(marker)}</Markdown>
        </SourceCitationProvider>
      );
      const { rerender } = render(content(`{{source:${CHUNK_ID}${separator}`));
      for (const label of ['', 'Quelle', 'Quelle 1}']) {
        rerender(content(`{{source:${CHUNK_ID}${separator}${label}`));
        expect(screen.queryByRole('button')).toBeNull();
        expect(
          screen.getAllByRole('cell').map((cell) => cell.textContent),
        ).toEqual([
          'Haushalt',
          `{{source:${CHUNK_ID}|${label}`,
          '1 / 3',
          'Folge',
          'unverändert',
          '2 / 3',
        ]);
      }
      rerender(content(`{{source:${CHUNK_ID}${separator}Quelle 1}}`));
      expect(screen.getByRole('button', { name: 'Quelle 1' })).toBeTruthy();
      expect(screen.getAllByRole('cell')).toHaveLength(6);
    },
  );

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
