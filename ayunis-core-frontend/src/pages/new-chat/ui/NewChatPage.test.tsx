import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewChatPage from './NewChatPage';

const mocks = vi.hoisted(() => ({ initiateChat: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@/features/chat-initiation', () => ({
  useInitiateChat: () => ({
    initiateChat: mocks.initiateChat,
    isCreating: false,
  }),
}));
vi.mock('@/features/usePermittedModels', () => ({
  usePermittedModels: () => ({ models: [] }),
}));
vi.mock('@/features/anonymous-mode-default', () => ({
  useAnonymousModeDefault: () => ({ isAnonymousByDefault: false }),
}));
vi.mock('@/features/academy', () => ({
  useAcademyAccessStatus: () => ({ isGated: false }),
}));
vi.mock('@/shared/contexts/chat/useChatContext', () => ({
  useChatContext: () => ({
    setPendingImages: vi.fn(),
    setPendingSkillId: vi.fn(),
  }),
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
vi.mock('./WorkspacePicker', () => ({ WorkspacePicker: () => null }));
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

beforeEach(() => vi.clearAllMocks());
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
});
