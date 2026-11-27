import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewChatComposerProps } from '@ayunis/chat/surface';
import { ChatStarter } from './ChatStarter';

const mocks = vi.hoisted(() => ({ initiateChat: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/chat-initiation', () => ({
  useInitiateChat: () => ({
    initiateChat: mocks.initiateChat,
    cancel: vi.fn(),
    isCreating: false,
  }),
}));
vi.mock('@/features/academy', () => ({
  useAcademyAccessStatus: () => ({ isGated: false }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/widgets/academy-gate-notice', () => ({
  AcademyGateNotice: () => null,
}));
vi.mock('@/widgets/chat-input', () => ({
  WEB_CHAT_TOUR_TARGETS: {},
  useChatResourceSelection: () => ({
    attached: [],
    attach: vi.fn(),
    detach: vi.fn(),
  }),
  useWebKnowledgeBases: () => undefined,
  useWebIntegrations: () => undefined,
}));
vi.mock('@ayunis/chat/surface', () => ({
  NewChatComposer: ({ onStart }: Pick<NewChatComposerProps, 'onStart'>) => (
    <button
      onClick={() =>
        onStart(
          {
            text: 'Hello',
            modelId: 'medium',
            isAnonymous: false,
            sources: [],
            onSourceStatus: vi.fn(),
          },
          vi.fn(),
        )
      }
    >
      Send
    </button>
  ),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('ChatStarter', () => {
  it('starts a chat in the given workspace', () => {
    render(<ChatStarter workspaceId="workspace-id" />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        modelId: 'medium',
        workspaceId: 'workspace-id',
        origin: undefined,
      }),
    );
  });

  it('starts a chat about the given notification outside any workspace', () => {
    render(
      <ChatStarter
        origin={{ kind: 'notification', notificationId: 'notification-id' }}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        modelId: 'medium',
        workspaceId: undefined,
        origin: { kind: 'notification', notificationId: 'notification-id' },
      }),
    );
  });
});
