import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';
import { SourceCitationProvider } from '@/widgets/markdown/model/source-citation-context';

vi.mock('./Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

const URL = 'https://www.muenchen.de/rathaus?topic=city&lang=de#services';
const MARKER = `{{url:${URL}}}`;

describe('Markdown URL references', () => {
  it('renders a hostname token with the complete safe destination', () => {
    render(<Markdown renderUrlReferences>{`See ${MARKER}.`}</Markdown>);
    const link = screen.getByTestId('url-reference');
    expect(link.textContent).toBe('muenchen.de');
    expect(link.getAttribute('href')).toBe(URL);
    expect(link.getAttribute('title')).toBe(URL);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.parentElement?.textContent).toBe('See muenchen.de.');
    expect(document.querySelector('img')).toBeNull();
  });

  it.each([
    'https://example.com/a_b_c?q=*value*',
    'https://example.com/?filter[]=news',
    "https://example.com/city's-services",
    'http://[::1]:3000/services',
    'http://example.com/path_(city)',
    'https://example.com/?q=a%20b&value=%7Bcity%7D',
  ])('preserves URL punctuation: %s', (url) => {
    render(<Markdown renderUrlReferences>{`{{url:${url}}}`}</Markdown>);
    expect(screen.getByTestId('url-reference').getAttribute('href')).toBe(url);
  });

  it.each([
    '{{url:javascript:alert(1)}}',
    '{{url:data:text/html,unsafe}}',
    '{{url:ftp://example.com}}',
    '{{url://example.com}}',
    '{{url:https://user:password@example.com}}',
    '{{url:https://}}',
    '{{url:https://example.com/with space}}',
    '{{url:https://example.com/unfinished',
    '{{url:}}',
    '{{{url:https://example.com}}}',
  ])('does not turn unsafe or malformed markers into tokens: %s', (marker) => {
    const { container } = render(
      <Markdown renderUrlReferences>{marker}</Markdown>,
    );
    expect(screen.queryByTestId('url-reference')).toBeNull();
    expect(container.textContent).toBe(marker);
  });

  it('renders consecutive non-autolinked URLs without duplicating markers', () => {
    render(
      <Markdown renderUrlReferences>
        {
          'Before {{url:HTTPS://example.com/one}} and {{url:HTTPS://example.org/two}} after'
        }
      </Markdown>,
    );
    expect(screen.getAllByTestId('url-reference')).toHaveLength(2);
    expect(document.body.textContent).toBe(
      'Before example.com and example.org after',
    );
  });

  it('renders URLs alongside PII, legal and source markers', () => {
    render(
      <Markdown
        renderUrlReferences
        renderLegalReferences
        renderSourceCitations
      >{`{{legal:DE/BGB/sec_433}} {{pii:PERSON_NAME_1}} ${MARKER} {{source:123e4567-e89b-12d3-a456-426614174000|City}}`}</Markdown>,
    );
    expect(screen.getByTestId('url-reference').getAttribute('href')).toBe(URL);
    expect(screen.getByTestId('legal-reference')).toBeTruthy();
  });

  it('preserves surrounding text around multiple URLs without autolinks', () => {
    render(
      <Markdown renderUrlReferences>
        {
          'Before {{url:http://localhost:3000/a}} and {{url:http://localhost:3000/b}} after'
        }
      </Markdown>,
    );
    expect(screen.getAllByTestId('url-reference')).toHaveLength(2);
    expect(document.body.textContent).toBe(
      'Before localhost and localhost after',
    );
  });

  it('leaves markers literal unless explicitly enabled', () => {
    const { container } = render(<Markdown>{MARKER}</Markdown>);
    expect(screen.queryByTestId('url-reference')).toBeNull();
    expect(container.textContent).toBe(MARKER);
  });

  it('preserves code and existing links without nested anchors', () => {
    render(
      <Markdown renderUrlReferences>{`\`${MARKER}\`

\`\`\`text
${MARKER}
\`\`\`

[${MARKER}](https://example.org)`}</Markdown>,
    );
    expect(screen.queryByTestId('url-reference')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link').textContent).toBe(MARKER);
  });

  it('renders multiple references in emphasis and tables', () => {
    render(
      <Markdown renderUrlReferences>{`**See ${MARKER}**

| Site |
| --- |
| {{url:https://example.com}} |`}</Markdown>,
    );
    expect(screen.getAllByTestId('url-reference')).toHaveLength(2);
    expect(screen.getByRole('cell').textContent).toBe('example.com');
  });

  it('protects URL pipes in tables and preserves literal markers in link titles', () => {
    const url = 'https://example.com/?query=city|services';
    render(
      <Markdown renderUrlReferences>{`| Site |
| --- |
| {{url:${url}}} |

[site](https://example.org "${MARKER}")`}</Markdown>,
    );
    expect(screen.getByTestId('url-reference').getAttribute('href')).toBe(url);
    expect(
      screen.getByRole('link', { name: 'site' }).getAttribute('title'),
    ).toBe(MARKER);
  });

  it('does not replace source text that resembles an internal placeholder', () => {
    const { container } = render(
      <Markdown
        renderUrlReferences
      >{`AYUNISURLREFERENCE0END ${MARKER}`}</Markdown>,
    );
    expect(container.textContent).toBe('AYUNISURLREFERENCE0END muenchen.de');
  });

  it('does not mistake entity-decoded text for an internal placeholder', () => {
    const { container } = render(
      <Markdown
        renderUrlReferences
      >{`AYUNISURLREF&#69;RENCE0END ${MARKER}`}</Markdown>,
    );
    expect(container.textContent).toBe('AYUNISURLREFERENCE0END muenchen.de');
    expect(screen.getAllByTestId('url-reference')).toHaveLength(1);
  });

  it('renders source citations beside URLs', () => {
    render(
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <Markdown renderUrlReferences renderSourceCitations>
          {`${MARKER} {{source:123e4567-e89b-12d3-a456-426614174000|City}}`}
        </Markdown>
      </SourceCitationProvider>,
    );
    expect(screen.getByTestId('url-reference')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'City' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('AYUNISURLREFERENCE');
  });

  it('updates tokens as streamed text completes, is removed, and is recreated', () => {
    const content = (text: string) => (
      <Markdown renderUrlReferences>{text}</Markdown>
    );
    const { rerender } = render(content(MARKER.slice(0, -1)));
    expect(screen.queryByTestId('url-reference')).toBeNull();
    rerender(content(MARKER));
    expect(screen.getByTestId('url-reference')).toBeTruthy();
    rerender(content('Removed'));
    expect(screen.queryByTestId('url-reference')).toBeNull();
    rerender(content('{{url:https://example.org/new}}'));
    expect(screen.getByTestId('url-reference').getAttribute('href')).toBe(
      'https://example.org/new',
    );
  });
});
