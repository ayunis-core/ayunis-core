import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';

vi.mock('./Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

describe('Markdown legal reference rendering', () => {
  it('renders federal and state markers as highlighted external links when enabled', () => {
    render(
      <Markdown renderLegalReferences>
        {'{{legal:DE/BGB/sec_433/par_2}} und {{legal:DE-BY/POG/art_1}}'}
      </Markdown>,
    );

    const federal = screen.getByRole('link', {
      name: '§ 433 Abs. 2 BGB',
    });
    const state = screen.getByRole('link', { name: 'Art. 1 POG' });

    expect(screen.getAllByTestId('legal-reference')).toHaveLength(2);
    expect(federal.getAttribute('href')).toBe(
      'https://bundesrecht.online/BGB/433#Abs2',
    );
    expect(state.getAttribute('href')).toBe(
      'https://landesrecht.online/BY/POG/1',
    );
    expect(federal.getAttribute('target')).toBe('_blank');
    expect(federal.getAttribute('rel')).toBe('noopener noreferrer');
    expect(federal.className).toContain('bg-brand/15');
    expect(federal.className).toContain('text-brand');
  });

  it('leaves legal markers literal by default', () => {
    const marker = '{{legal:DE/BGB/sec_433}}';

    render(<Markdown>{marker}</Markdown>);

    expect(screen.getByText(marker)).toBeTruthy();
    expect(screen.queryByTestId('legal-reference')).toBeNull();
  });

  it('leaves invalid and unsupported markers literal when enabled', () => {
    const marker = '{{legal:DE-XX/POG/art_1}}';

    render(<Markdown renderLegalReferences>{marker}</Markdown>);

    expect(screen.getByText(marker)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render markers inside inline or fenced code as links', () => {
    const marker = '{{legal:DE/BGB/sec_433}}';

    render(
      <Markdown renderLegalReferences>
        {`Inline \`${marker}\`\n\n\`\`\`text\n${marker}\n\`\`\``}
      </Markdown>,
    );

    expect(screen.getAllByText(marker)).toHaveLength(2);
    expect(screen.queryByTestId('legal-reference')).toBeNull();
  });

  it('does not create a nested link from a marker in an existing link', () => {
    const marker = '{{legal:DE/BGB/sec_433}}';

    render(
      <Markdown
        renderLegalReferences
      >{`[${marker}](https://example.com)`}</Markdown>,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://example.com');
    expect(links[0].textContent).toBe(marker);
    expect(screen.queryByTestId('legal-reference')).toBeNull();
  });

  it('turns a completed streamed marker into a link on rerender', () => {
    const { rerender } = render(
      <Markdown renderLegalReferences>{'{{legal:DE/BGB/sec_43'}</Markdown>,
    );

    expect(screen.queryByTestId('legal-reference')).toBeNull();

    rerender(
      <Markdown renderLegalReferences>{'{{legal:DE/BGB/sec_433}}'}</Markdown>,
    );

    expect(screen.getByRole('link', { name: '§ 433 BGB' })).toBeTruthy();
  });
});
