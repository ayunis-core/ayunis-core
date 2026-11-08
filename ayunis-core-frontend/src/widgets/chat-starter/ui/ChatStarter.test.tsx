import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('@/features/usePermittedModels', () => ({
  usePermittedModels: () => ({ models: [{ id: 'medium' }] }),
}));
vi.mock('@/features/useModelModes', () => ({
  useModelModes: () => ({ resolutions: [] }),
}));
vi.mock('@/features/anonymous-mode-default', () => ({
  useAnonymousModeDefault: () => ({ isAnonymousByDefault: false }),
}));
vi.mock('@/features/academy', () => ({
  useAcademyAccessStatus: () => ({ isGated: false }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/widgets/academy-gate-notice', () => ({
  AcademyGateNotice: () => null,
}));
vi.mock('@/widgets/chat-input', () => ({
  default: ({ onSend }: { onSend: (message: string) => void }) => (
    <button onClick={() => onSend('Hello')}>Send</button>
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
    render(
      <ChatStarter
        workspaceId="workspace-id"
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        modelId: 'medium',
        workspaceId: 'workspace-id',
        sourceNotificationId: undefined,
      }),
    );
  });

  it('starts a chat about the given notification outside any workspace', () => {
    render(
      <ChatStarter
        sourceNotificationId="notification-id"
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Hello',
        modelId: 'medium',
        workspaceId: undefined,
        sourceNotificationId: 'notification-id',
      }),
    );
  });
});
