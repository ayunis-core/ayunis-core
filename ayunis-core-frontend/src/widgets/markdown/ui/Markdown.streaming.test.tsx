import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';
import { PiiMaskProvider } from '@/widgets/markdown/model/pii-mask-context';
import { SourceCitationProvider } from '@/widgets/markdown/model/source-citation-context';

vi.mock('./Codeblock', () => ({
  default: ({
    children,
    highlight = true,
  }: {
    children: string;
    highlight?: boolean;
  }) => (
    <pre data-testid="code-block" data-highlight={String(highlight)}>
      {children}
    </pre>
  ),
}));

const CHUNK_ID = '123e4567-e89b-12d3-a456-426614174000';
const PII_TOKEN = '{{pii:PERSON_NAME_1}}';

const STREAMED_SO_FAR = [
  `Laut ${PII_TOKEN} gilt {{legal:DE/BGB/sec_433}} {{source:${CHUNK_ID}|Quelle 1}}.`,
  'Mehr unter {{url:https://www.muenchen.de/rathaus}} und [Portal](https://example.com).',
  '| Amt | Frist |\n| --- | --- |\n| Bauamt | 2 Wochen |',
  '```ts\nconst a = 1;\n```',
].join('\n\n');

function StreamedMarkdown({ text }: Readonly<{ text: string }>) {
  return (
    <PiiMaskProvider
      masks={[
        {
          id: 'mask-1',
          token: PII_TOKEN,
          value: 'Erika Mustermann',
          category: 'person_name',
          unmasked: false,
        },
      ]}
    >
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown
          isStreaming
          renderLegalReferences
          renderSourceCitations
          renderUrlReferences
        >
          {text}
        </Markdown>
      </SourceCitationProvider>
    </PiiMaskProvider>
  );
}

function customNodes() {
  return {
    citation: screen.getByTestId('source-citation'),
    urlReference: screen.getByTestId('url-reference'),
    link: screen.getByRole('link', { name: 'Portal' }),
    legalReference: screen.getByTestId('legal-reference'),
    table: screen.getByRole('table'),
    codeBlock: screen.getByTestId('code-block'),
    piiToken: screen.getByText('Erika Mustermann'),
  };
}

describe('Markdown while streaming', () => {
  it('keeps custom nodes mounted when the streamed text grows', () => {
    const { rerender } = render(<StreamedMarkdown text={STREAMED_SO_FAR} />);
    const before = customNodes();

    rerender(
      <StreamedMarkdown
        text={`${STREAMED_SO_FAR}\n\nDie Antwort geht weiter`}
      />,
    );

    const after = customNodes();
    for (const [name, node] of Object.entries(before)) {
      expect(after[name as keyof typeof after], name).toBe(node);
    }
  });

  it('skips highlighting a code fence until it is closed', () => {
    const opened = 'Beispiel:\n\n```ts\nconst a = 1;';
    const { rerender } = render(<StreamedMarkdown text={opened} />);
    expect(screen.getByTestId('code-block').dataset.highlight).toBe('false');

    rerender(<StreamedMarkdown text={`${opened}\n\``} />);
    expect(screen.getByTestId('code-block').dataset.highlight).toBe('false');

    rerender(<StreamedMarkdown text={`${opened}\n\`\`\``} />);
    expect(screen.getByTestId('code-block').dataset.highlight).toBe('true');
  });

  it('highlights a closed fence while text after it streams', () => {
    render(
      <StreamedMarkdown text={'```ts\nconst a = 1;\n```\n\nDanach folgt'} />,
    );

    expect(screen.getByTestId('code-block').dataset.highlight).toBe('true');
  });

  it('recognizes a closed fence inside a blockquote', () => {
    render(<StreamedMarkdown text={'> ```ts\n> const a = 1;\n> ```'} />);

    expect(screen.getByTestId('code-block').dataset.highlight).toBe('true');
  });

  it('highlights an unclosed fence once the message has finished', () => {
    render(<Markdown>{'```ts\nconst a = 1;'}</Markdown>);

    expect(screen.getByTestId('code-block').dataset.highlight).toBe('true');
  });
});
