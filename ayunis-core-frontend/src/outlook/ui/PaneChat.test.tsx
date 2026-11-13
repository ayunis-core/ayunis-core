import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MeResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';
import type { PaneMessage } from '@/outlook/lib/pane-messages';
import { PaneChat } from '@/outlook/ui/PaneChat';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// jsdom has no layout, so the message list's scroll-into-view is a no-op here.
Element.prototype.scrollIntoView = vi.fn();

const THREAD_ID = 't1';
const REPLY_TEXT = 'Der Bauantrag ist vollstaendig.';

const reply: PaneMessage = {
  id: 'm1',
  threadId: THREAD_ID,
  createdAt: '2026-11-13T10:00:00.000Z',
  role: 'assistant',
  content: [{ type: 'text', text: REPLY_TEXT }],
};

function fakeApi(): PaneChatApi {
  return {
    listThreads: vi.fn(() =>
      Promise.resolve([
        {
          id: THREAD_ID,
          title: 'Bauantrag',
          updatedAt: '2026-11-13T10:00:00.000Z',
        },
        {
          id: 't2',
          title: 'Urlaub',
          updatedAt: '2026-11-13T09:00:00.000Z',
        },
      ] as Awaited<ReturnType<PaneChatApi['listThreads']>>),
    ),
    getThread: vi.fn(() =>
      Promise.resolve({ id: THREAD_ID, messages: [reply] } as Awaited<
        ReturnType<PaneChatApi['getThread']>
      >),
    ),
    deleteThread: vi.fn(() => Promise.resolve()),
    renameThread: vi.fn(() => Promise.resolve()),
    createThread: vi.fn(),
    createUpload: vi.fn(),
    completeUpload: vi.fn(),
    signUpload: vi.fn(),
    abortUpload: vi.fn(),
    listSources: vi.fn(),
    run: vi.fn(),
  };
}

const user = { name: 'Mara', email: 'mara@example.com' } as MeResponseDto;

function renderPane(api: PaneChatApi) {
  return render(
    <PaneChat
      api={api}
      user={user}
      onSignOut={vi.fn()}
      onSessionExpired={vi.fn()}
    />,
  );
}

describe('PaneChat', () => {
  it('leaves the deleted chat behind instead of keeping it open to post to', async () => {
    const api = fakeApi();
    renderPane(api);

    fireEvent.click(screen.getByTestId('outlook-pane-history'));
    fireEvent.click((await screen.findAllByTestId('outlook-pane-thread'))[0]);
    expect(await screen.findByText(REPLY_TEXT)).toBeTruthy();

    fireEvent.click(screen.getByTestId('outlook-pane-history'));
    fireEvent.click(
      (await screen.findAllByTestId('outlook-pane-thread-delete'))[0],
    );
    fireEvent.click(screen.getByTestId('outlook-pane-thread-delete-confirm'));
    await waitFor(() =>
      expect(api.deleteThread).toHaveBeenCalledWith(THREAD_ID),
    );

    fireEvent.click(screen.getByTestId('outlook-pane-history'));

    expect(screen.queryByText(REPLY_TEXT)).toBeNull();
    expect(screen.getByTestId('outlook-pane-quick-actions')).toBeTruthy();
  });

  it('keeps the open chat when a different one is deleted', async () => {
    const api = fakeApi();
    renderPane(api);

    fireEvent.click(screen.getByTestId('outlook-pane-history'));
    fireEvent.click((await screen.findAllByTestId('outlook-pane-thread'))[0]);
    expect(await screen.findByText(REPLY_TEXT)).toBeTruthy();

    fireEvent.click(screen.getByTestId('outlook-pane-history'));
    fireEvent.click(
      (await screen.findAllByTestId('outlook-pane-thread-delete'))[1],
    );
    fireEvent.click(screen.getByTestId('outlook-pane-thread-delete-confirm'));
    await waitFor(() => expect(api.deleteThread).toHaveBeenCalledWith('t2'));

    fireEvent.click(screen.getByTestId('outlook-pane-history'));

    expect(screen.getByText(REPLY_TEXT)).toBeTruthy();
  });
});
