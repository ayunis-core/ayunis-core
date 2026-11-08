import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Markdown from '@/widgets/markdown/ui/Markdown';
import { PiiMaskProvider } from '@/widgets/markdown/model/pii-mask-context';
import type { PiiMaskEntry } from '@/widgets/markdown/model/pii-mask-context';
import { SourceCitationProvider } from '@/widgets/markdown/model/source-citation-context';
import {
  hasSpeakableText,
  speakableMessageText,
} from './speakable-message-text';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key.startsWith('chat.piiMask.categories.') ? `[${key.slice(24)}]` : key,
    i18n: { language: 'de' },
  }),
}));

vi.mock('@/widgets/markdown/ui/Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

const masks: PiiMaskEntry[] = [
  {
    id: '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c',
    token: '{{pii:PERSON_NAME_1}}',
    value: 'Max Mustermann',
    category: 'person_name',
    unmasked: false,
  },
  {
    id: '5b2a1c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    token: '{{pii:EMAIL_ADDRESS_1}}',
    value: 'max@example.org',
    category: 'email_address',
    unmasked: true,
  },
];

function renderMessage(markdown: string, extra?: React.ReactNode) {
  const { container } = render(
    <PiiMaskProvider masks={masks} onUnmaskRequest={vi.fn()}>
      <SourceCitationProvider onCitationClick={vi.fn()}>
        <div data-copyable="true">
          <Markdown renderSourceCitations>{markdown}</Markdown>
        </div>
        {extra}
      </SourceCitationProvider>
    </PiiMaskProvider>,
  );
  return speakableMessageText(container);
}

describe('speakableMessageText', () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent;
      },
    });
  });

  it('reads masked and unmasked PII as its category, never its value', () => {
    const text = renderMessage(
      'Schreib an {{pii:PERSON_NAME_1}} unter {{pii:EMAIL_ADDRESS_1}}, nicht an {{pii:LOCATION_9}}.',
    );

    expect(text).not.toContain('Max Mustermann');
    expect(text).not.toContain('max@example.org');
    expect(text).not.toContain('{{pii:');
    expect(text).toContain('Schreib an [person_name] unter [email_address]');
    expect(text).toContain('nicht an [other]');
  });

  it('drops code blocks but keeps inline code', () => {
    const text = renderMessage(
      'Installiere es mit `pnpm install`.\n\n```bash\nrm -rf /tmp/cache\n```\n\nFertig.',
    );

    expect(text).toContain('Installiere es mit pnpm install.');
    expect(text).toContain('Fertig.');
    expect(text).not.toContain('rm -rf');
  });

  it('reads a table row by row', () => {
    const text = renderMessage(
      '| Amt | Öffnungszeit |\n| --- | --- |\n| Bürgerbüro | 8 bis 12 Uhr |\n| Bauamt | 9 bis 15 Uhr |',
    );

    expect(text).toContain('Amt, Öffnungszeit.');
    expect(text).toContain('Bürgerbüro, 8 bis 12 Uhr.');
    expect(text).toContain('Bauamt, 9 bis 15 Uhr.');
    expect(text).not.toContain('|');
  });

  it('keeps the text of links and drops their address', () => {
    const text = renderMessage(
      'Mehr dazu im [Bürgerportal](https://portal.example.org/termine).',
    );

    expect(text).toContain('Mehr dazu im Bürgerportal.');
    expect(text).not.toContain('https://');
  });

  it('drops source citation chips', () => {
    const text = renderMessage(
      'Die Frist beträgt vier Wochen {{source:123e4567-e89b-12d3-a456-426614174000|Satzung S. 3}}.',
    );

    expect(text).toContain('Die Frist beträgt vier Wochen');
    expect(text).not.toContain('Satzung S. 3');
  });

  it('strips markdown symbols that were not rendered', () => {
    const text = renderMessage(
      '\\# Titel\n\nErgebnis: \\*\\*wichtig\\*\\* für C# und `x`',
    );

    expect(text).toContain('Titel');
    expect(text).not.toContain('# Titel');
    expect(text).toContain('Ergebnis: wichtig für C# und x');
  });

  it('reads only the assistant text, not tool steps', () => {
    const text = renderMessage(
      'Hier ist die Zusammenfassung.',
      <div data-testid="tool-step">web_search: Öffnungszeiten Bürgerbüro</div>,
    );

    expect(text).toBe('Hier ist die Zusammenfassung.');
  });

  it('joins several text blocks of one answer', () => {
    const { container } = render(
      <>
        <div data-copyable="true">Erster Teil.</div>
        <div>tool call</div>
        <div data-copyable="true">Zweiter Teil.</div>
      </>,
    );

    expect(speakableMessageText(container)).toBe(
      'Erster Teil.\n\nZweiter Teil.',
    );
  });
});

describe('hasSpeakableText', () => {
  it.each([
    ['```bash\npnpm install\n```', false],
    ['~~~\nSELECT 1;\n~~~\n\n', false],
    ['```ts\nconst unfinished = true;', false],
    ['Run this:\n\n```bash\npnpm install\n```', true],
    ['```\ncode\n```\nDone.', true],
    ['Plain answer', true],
  ])('reads %j: %s', (markdown, expected) => {
    expect(hasSpeakableText(markdown)).toBe(expected);
  });
});
