import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';
import { ReleaseNoteListItem } from './ReleaseNoteListItem';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { date?: string }) =>
      values?.date ? `${key}:${values.date}` : key,
    i18n: { language: 'de' },
  }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children: ReactNode;
    to: string;
    params: { releaseNoteId: string };
  }) => (
    <a href={to.replace('$releaseNoteId', params.releaseNoteId)} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

function releaseNote(
  overrides: Partial<ReleaseNoteResponseDto> = {},
): ReleaseNoteResponseDto {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    headline: 'Auto und Max Modus',
    body: '**Neue Chats** lassen sich jetzt noch einfacher starten.',
    media: { type: 'image', url: null },
    unread: true,
    date: '2026-11-05',
    ...overrides,
  };
}

describe('ReleaseNoteListItem', () => {
  it('shows kicker with date, headline, plain-text summary, thumbnail and the unread dot', () => {
    render(<ReleaseNoteListItem releaseNote={releaseNote()} />);

    const item = screen.getByTestId('release-note-item');
    expect(item.dataset.unread).toBe('true');
    expect(item.textContent).toContain('list.kicker:5. November 2026');
    expect(item.textContent).toContain(
      'Neue Chats lassen sich jetzt noch einfacher starten.',
    );
    expect(
      screen.getByTestId('release-note-item-headline').getAttribute('href'),
    ).toBe('/news/55555555-5555-4555-8555-555555555555');
    expect(
      screen.getByTestId<HTMLImageElement>('release-note-item-image').src,
    ).toMatch(/\/release-notes\/55555555-5555-4555-8555-555555555555\/image$/);
    expect(screen.getByTestId('release-note-unread-dot')).toBeTruthy();
  });

  it('shows no dot for a read update', () => {
    render(
      <ReleaseNoteListItem releaseNote={releaseNote({ unread: false })} />,
    );

    expect(screen.queryByTestId('release-note-unread-dot')).toBeNull();
  });

  it.each([
    ['a Loom video', { type: 'loom', url: 'https://www.loom.com/embed/4f7c' }],
    ['no media', null],
  ] as const)('shows a placeholder thumbnail for %s', (_label, media) => {
    render(<ReleaseNoteListItem releaseNote={releaseNote({ media })} />);

    expect(screen.getByTestId('release-note-item-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('release-note-item-image')).toBeNull();
  });
});
