import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewChatPage from './NewChatPage';

const mocks = vi.hoisted(() => ({
  initiateChat: vi.fn(),
  isCreating: false,
  isEmbedded: false,
  onboardingStage: undefined as
    | { stage: 'profile' | 'first_skill' | null; modelId: string | null }
    | undefined,
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
vi.mock('@/pages/new-chat/api/useOnboardingStage', () => ({
  useOnboardingStage: (enabled: boolean) =>
    enabled ? mocks.onboardingStage : undefined,
}));
vi.mock('@/shared/contexts/embedded/embeddedContext', () => ({
  useEmbedded: () => mocks.isEmbedded,
}));
vi.mock('./EmbeddedNewChat', () => ({
  EmbeddedHistoryButton: () => null,
  EmbeddedNewChatCompose: ({ chatInput }: { chatInput: ReactNode }) =>
    chatInput,
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
vi.mock('./NewChatPageLayout', () => ({
  default: ({ compose }: { compose: ReactNode }) => compose,
}));
vi.mock('@/widgets/chat-input', () => ({
  usePendingArtifacts: () => ({
    artifacts: [],
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  }),
  default: ({
    modelId,
    onModelChange,
    onSend,
    onAnonymousChange,
  }: {
    modelId?: string;
    onModelChange: (id: string) => void;
    onSend: (message: string) => void;
    onAnonymousChange: (isAnonymous: boolean) => void;
  }) => (
    <>
      <output data-testid="selected-model">{modelId}</output>
      <button onClick={() => onModelChange('manual')}>Choose manually</button>
      <button onClick={() => onAnonymousChange(true)}>Go anonymous</button>
      <button onClick={() => onSend('Hello')}>Send</button>
    </>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isCreating = false;
  mocks.isEmbedded = false;
  mocks.onboardingStage = undefined;
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

describe('new chat onboarding hint', () => {
  it('starts a non-anonymous profile chat on the stage model, whatever the composer selected', () => {
    mocks.onboardingStage = { stage: 'profile', modelId: 'memory-model' };
    setup('mode:auto');
    fireEvent.click(screen.getByRole('button', { name: 'Go anonymous' }));

    fireEvent.click(screen.getByTestId('new-chat-onboarding-hint'));

    const [params] = mocks.initiateChat.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(params).toMatchObject({
      message: 'newChat.onboardingHint.profile.message',
      modelId: 'memory-model',
      isAnonymous: false,
      origin: { kind: 'onboarding', stage: 'profile' },
    });
    expect(params).not.toHaveProperty('mode');
  });

  it('starts a first-skill chat with the composer model and anonymous mode', () => {
    mocks.onboardingStage = { stage: 'first_skill', modelId: null };
    setup('mode:auto');
    fireEvent.click(screen.getByRole('button', { name: 'Go anonymous' }));

    fireEvent.click(screen.getByTestId('new-chat-onboarding-hint'));

    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'auto',
        isAnonymous: true,
        origin: { kind: 'onboarding', stage: 'first_skill' },
      }),
    );
  });

  it('shows no hint in the Outlook pane even when a stage applies', () => {
    mocks.isEmbedded = true;
    mocks.onboardingStage = { stage: 'profile', modelId: 'memory-model' };
    setup('medium');

    expect(screen.queryByTestId('new-chat-onboarding-hint')).toBeNull();
  });
});
