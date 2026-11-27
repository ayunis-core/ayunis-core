import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';
import type * as ReleaseNotes from '@/features/release-notes';
import ReleaseNotePage from './ReleaseNotePage';

const mocks = vi.hoisted(() => ({ markRead: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { date?: string }) =>
      values?.date ? `${key}:${values.date}` : key,
    i18n: { language: 'de' },
  }),
}));
vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/layouts/content-area-layout/ui/ContentAreaLayout', () => ({
  default: (props: { contentHeader: ReactNode; contentArea: ReactNode }) => (
    <div>
      {props.contentHeader}
      {props.contentArea}
    </div>
  ),
}));
vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: (props: { breadcrumbs: { label: string; href?: string }[] }) => (
    <nav data-testid="breadcrumbs">{JSON.stringify(props.breadcrumbs)}</nav>
  ),
}));
vi.mock('@/widgets/markdown', () => ({
  Markdown: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/widgets/chat-starter', () => ({
  ChatStarter: (props: {
    origin?: { kind: string; releaseNoteId?: string };
    placeholder?: string;
  }) => <output data-testid="chat-starter">{JSON.stringify(props)}</output>,
}));
vi.mock('@/features/release-notes', async (importOriginal) => ({
  ...(await importOriginal<typeof ReleaseNotes>()),
  useMarkReleaseNoteRead: () => ({ mutate: mocks.markRead }),
}));
vi.mock('@/pages/release-note/api/useReleaseNote', () => ({
  useReleaseNote: (releaseNote: ReleaseNoteResponseDto) => ({ releaseNote }),
}));

afterEach(() => {
  cleanup();
  mocks.markRead.mockClear();
});

const ID = '55555555-5555-4555-8555-555555555555';

function renderPage(overrides: Partial<ReleaseNoteResponseDto> = {}) {
  render(
    <ReleaseNotePage
      releaseNote={{
        id: ID,
        headline: 'Auto und Max Modus',
        body: 'Neue Chats lassen sich jetzt noch einfacher starten.',
        media: { type: 'image', url: null },
        unread: true,
        date: '2026-11-05',
        ...overrides,
      }}
    />,
  );
}

describe('ReleaseNotePage', () => {
  it('shows breadcrumb, kicker, headline, image and body', () => {
    renderPage();

    expect(screen.getByTestId('breadcrumbs').textContent).toBe(
      JSON.stringify([
        { label: 'page.title', href: '/news' },
        { label: 'Auto und Max Modus' },
      ]),
    );
    const detail = screen.getByTestId('release-note-detail');
    expect(detail.textContent).toContain('detail.kicker:5. November 2026');
    expect(detail.textContent).toContain('Neue Chats lassen sich');
    expect(screen.getByTestId('release-note-detail-headline').textContent).toBe(
      'Auto und Max Modus',
    );
    expect(
      screen.getByTestId<HTMLImageElement>('release-note-detail-image').src,
    ).toMatch(new RegExp(`/release-notes/${ID}/image$`));
  });

  it('embeds a Loom video instead of an image', () => {
    const url = 'https://www.loom.com/embed/4f7c2d9e1b8a4c6d9e2f1a3b5c7d9e0f';
    renderPage({ media: { type: 'loom', url } });

    expect(
      screen.getByTestId<HTMLIFrameElement>('release-note-detail-loom').src,
    ).toBe(url);
    expect(screen.queryByTestId('release-note-detail-image')).toBeNull();
  });

  it('marks an unread update read when it is opened, and a read one not again', () => {
    renderPage();
    expect(mocks.markRead).toHaveBeenCalledWith(ID);

    cleanup();
    mocks.markRead.mockClear();
    renderPage({ unread: false });
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it('starts chats about the update', () => {
    renderPage();

    expect(
      JSON.parse(screen.getByTestId('chat-starter').textContent),
    ).toMatchObject({
      origin: { kind: 'release_note', releaseNoteId: ID },
      placeholder: 'detail.chatPlaceholder',
    });
  });
});
