import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewChatPage from './NewChatPage';

const mocks = vi.hoisted(() => ({
  initiateChat: vi.fn(),
  isCreating: false,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock('@/features/chat-initiation', () => ({
  useInitiateChat: () => ({
    initiateChat: mocks.initiateChat,
    isCreating: mocks.isCreating,
  }),
}));
vi.mock('@/features/usePermittedModels', () => ({
  usePermittedModels: () => ({ models: [{ id: 'balanced' }] }),
}));
vi.mock('@/features/useModelModes', () => ({
  useModelModes: () => ({
    resolutions: [
      {
        mode: 'auto',
        permittedModelId: 'balanced',
        anonymousPermittedModelId: 'balanced',
      },
      { mode: 'max', permittedModelId: null, anonymousPermittedModelId: null },
    ],
  }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
vi.mock('@/features/anonymous-mode-default', () => ({
  useAnonymousModeDefault: () => ({ isAnonymousByDefault: false }),
}));
vi.mock('@/features/academy', () => ({
  useAcademyAccessStatus: () => ({ isGated: false }),
}));
vi.mock('@/shared/hooks/useFileFromUrl', () => ({ useFileFromUrl: vi.fn() }));
vi.mock('@/pages/new-chat/model/useTimeBasedGreeting', () => ({
  useTimeBasedGreeting: () => 'Hello',
}));
vi.mock('@/pages/new-chat/api/useUserSystemPromptStatus', () => ({
  useUserSystemPromptStatus: () => ({ hasSystemPrompt: true }),
}));
vi.mock('@/pages/new-chat/api/useSkipPersonalization', () => ({
  useSkipPersonalization: () => ({}),
}));
vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: () => null,
}));
vi.mock('@/shared/ui/help-link/HelpLink', () => ({ HelpLink: () => null }));
vi.mock('@/widgets/onboarding', () => ({
  TOUR_TARGET: {},
  OnboardingTourTarget: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/widgets/academy-gate-notice', () => ({
  AcademyGateNotice: () => null,
}));
vi.mock('./PinnedSkills', () => ({ PinnedSkills: () => null }));
vi.mock('./UnreadNotificationsPanel', () => ({
  UnreadNotificationsPanel: () => null,
}));
vi.mock('./WorkspacePicker', () => ({
  WorkspacePicker: () => <div data-testid="workspace-picker" />,
}));
vi.mock('./PersonalizationCard', () => ({ PersonalizationCard: () => null }));
vi.mock('./NewChatPageLayout', () => ({
  default: ({ compose }: { compose: ReactNode }) => compose,
}));
vi.mock('@/widgets/chat-input', () => ({
  default: ({
    modelId,
    onModelChange,
    onSend,
  }: {
    modelId?: string;
    onModelChange: (id: string) => void;
    onSend: (message: string) => void;
  }) => (
    <>
      <output data-testid="selected-model">{modelId}</output>
      <button onClick={() => onModelChange('manual')}>Choose manually</button>
      <button onClick={() => onSend('Hello')}>Send</button>
    </>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isCreating = false;
});
afterEach(cleanup);

function setup(modelId?: string) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <NewChatPage selectedModelId={modelId} isEmbeddingModelEnabled={false} />,
    { wrapper },
  );
}

describe('new chat model selection', () => {
  it('uses a refreshed route default for display and the new thread', () => {
    const { rerender } = setup('medium');
    rerender(
      <NewChatPage selectedModelId="large" isEmbeddingModelEnabled={false} />,
    );
    expect(screen.getByTestId('selected-model').textContent).toBe('large');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'large' }),
    );
  });

  it('preserves a manual selection when the route default is unchanged', () => {
    const { rerender } = setup('medium');
    fireEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
    rerender(
      <NewChatPage selectedModelId="medium" isEmbeddingModelEnabled={false} />,
    );
    expect(screen.getByTestId('selected-model').textContent).toBe('manual');
  });

  it('selects a default that becomes available after an empty result', () => {
    const { rerender } = setup();
    rerender(
      <NewChatPage selectedModelId="large" isEmbeddingModelEnabled={false} />,
    );
    expect(screen.getByTestId('selected-model').textContent).toBe('large');
  });

  it('clears the old selection when a refresh no longer supplies a model', () => {
    const { rerender } = setup('medium');
    rerender(<NewChatPage isEmbeddingModelEnabled={false} />);
    expect(screen.getByTestId('selected-model').textContent).toBe('');
  });

  it('starts a chat in a mode by sending the mode, not a model id', () => {
    setup('mode:auto');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    const [params] = mocks.initiateChat.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(params.mode).toBe('auto');
    expect(params).not.toHaveProperty('modelId');
  });

  it('does not start a chat in a mode that resolves to no model', () => {
    setup('mode:max');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(mocks.initiateChat).not.toHaveBeenCalled();
  });

  it('removes the workspace picker as soon as chat creation starts', () => {
    const { rerender } = setup('mode:auto');
    expect(screen.getByTestId('workspace-picker')).toBeTruthy();

    mocks.isCreating = true;
    rerender(
      <NewChatPage
        selectedModelId="mode:auto"
        isEmbeddingModelEnabled={false}
      />,
    );

    expect(screen.queryByTestId('workspace-picker')).toBeNull();
  });
});
