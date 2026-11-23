import type { ReactNode } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStarter } from './ChatStarter';

const mocks = vi.hoisted(() => ({
  initiateChat: vi.fn(),
  requestConversion: vi.fn(),
  models: [{ id: 'medium', anonymousOnly: false }],
}));
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
  usePermittedModels: () => ({ models: mocks.models }),
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
vi.mock('@/widgets/artifact-panel', () => ({
  useArtifactConversion: () => mocks.requestConversion,
}));
vi.mock('@/widgets/academy-gate-notice', () => ({
  AcademyGateNotice: () => null,
}));
vi.mock('@/widgets/chat-input', () => ({
  usePendingArtifacts: () => ({
    artifacts: [],
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  }),
  default: ({
    onSend,
    isSendDisabled,
    onAnonymousChange,
  }: {
    onSend: (message: string) => void;
    isSendDisabled?: boolean;
    onAnonymousChange: (isAnonymous: boolean) => void;
  }) => (
    <>
      <button onClick={() => onAnonymousChange(false)}>Normal</button>
      <button disabled={isSendDisabled} onClick={() => onSend('Hello')}>
        Send
      </button>
    </>
  ),
}));

function artifact(isAnonymous: boolean) {
  return {
    id: 'artifact-id',
    title: 'Bescheid',
    ownerType: 'personal' as const,
    creatorId: 'user-id',
    isAnonymous,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.models = [{ id: 'medium', anonymousOnly: false }];
});
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
        origin: undefined,
      }),
    );
  });

  it('starts a chat about the given notification outside any workspace', () => {
    render(
      <ChatStarter
        origin={{ kind: 'notification', notificationId: 'notification-id' }}
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
        origin: { kind: 'notification', notificationId: 'notification-id' },
      }),
    );
  });

  it('keeps a chat about a normal artifact from starting on an anonymous-only model, whose anonymous chat could not take the artifact', () => {
    mocks.models = [{ id: 'medium', anonymousOnly: true }];
    render(
      <ChatStarter
        artifact={artifact(false)}
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Send' }).disabled,
    ).toBe(true);
    expect(
      screen.getByTestId('chat-starter-artifact-mode-notice'),
    ).toBeTruthy();
  });

  it('starts a chat about an artifact linked to it, in the artifact’s mode', async () => {
    render(
      <ChatStarter
        artifact={artifact(true)}
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(mocks.initiateChat).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactIds: ['artifact-id'],
          isAnonymous: true,
        }),
      ),
    );
    expect(mocks.requestConversion).not.toHaveBeenCalled();
  });

  it('creates no normal chat about an anonymous artifact that was not converted, which the chat could not take', async () => {
    mocks.requestConversion.mockResolvedValue(false);
    render(
      <ChatStarter
        artifact={artifact(true)}
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(mocks.requestConversion).toHaveBeenCalledWith(artifact(true)),
    );
    expect(mocks.initiateChat).not.toHaveBeenCalled();
  });

  it('starts a normal chat about an anonymous artifact once it is converted', async () => {
    mocks.requestConversion.mockResolvedValue(true);
    render(
      <ChatStarter
        artifact={artifact(true)}
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Normal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(mocks.initiateChat).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactIds: ['artifact-id'],
          isAnonymous: false,
        }),
      ),
    );
  });

  it('creates no chat while the page keeps the user, e.g. to go on with unsaved edits', async () => {
    const confirmStart = vi.fn().mockResolvedValue(false);
    render(
      <ChatStarter
        artifact={artifact(false)}
        confirmStart={confirmStart}
        selectedModelId="medium"
        isEmbeddingModelEnabled={false}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(confirmStart).toHaveBeenCalled());
    expect(mocks.initiateChat).not.toHaveBeenCalled();
  });
});
