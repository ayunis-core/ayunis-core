import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewChatComposerProps } from '@ayunis/chat/surface';
import NewChatPage from './NewChatPage';

const mocks = vi.hoisted(() => ({
  initiateChat: vi.fn(),
  isCreating: false,
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
    cancel: vi.fn(),
    isCreating: mocks.isCreating,
  }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));
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
  default: ({
    leadingContent,
    composer,
  }: {
    leadingContent: ReactNode;
    composer: ReactNode;
  }) => (
    <>
      {leadingContent}
      {composer}
    </>
  ),
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
  NewChatComposer: ({
    onStart,
    onSelectionChange,
  }: Pick<NewChatComposerProps, 'onStart' | 'onSelectionChange'>) => (
    <>
      <button
        onClick={() =>
          onSelectionChange?.({
            model: { mode: 'auto' },
            isAnonymous: true,
            canStart: true,
          })
        }
      >
        Go anonymous in Auto
      </button>
      <button
        onClick={() =>
          onStart(
            {
              text: 'Hello',
              mode: 'auto',
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
    </>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isCreating = false;
  mocks.onboardingStage = undefined;
});
afterEach(cleanup);

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<NewChatPage />, { wrapper });
}

describe('new chat start', () => {
  it('passes the composer mode to the chat initiation without a model id', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    const [params] = mocks.initiateChat.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(params).toMatchObject({ message: 'Hello', mode: 'auto' });
    expect(params).not.toHaveProperty('modelId');
  });

  it('removes the workspace picker as soon as chat creation starts', () => {
    const { rerender } = setup();
    expect(screen.getByTestId('workspace-picker')).toBeTruthy();

    mocks.isCreating = true;
    rerender(<NewChatPage />);

    expect(screen.queryByTestId('workspace-picker')).toBeNull();
  });
});

describe('new chat onboarding hint', () => {
  it('starts a non-anonymous profile chat on the stage model, whatever the composer selected', () => {
    mocks.onboardingStage = { stage: 'profile', modelId: 'memory-model' };
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Go anonymous in Auto' }),
    );

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
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Go anonymous in Auto' }),
    );

    fireEvent.click(screen.getByTestId('new-chat-onboarding-hint'));

    expect(mocks.initiateChat).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'auto',
        isAnonymous: true,
        origin: { kind: 'onboarding', stage: 'first_skill' },
      }),
    );
  });
});
