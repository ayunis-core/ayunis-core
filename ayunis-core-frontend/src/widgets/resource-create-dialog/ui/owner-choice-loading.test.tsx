import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  KnowledgeBaseCreateDialog,
  SkillCreateDialog,
} from './ResourceCreateDialogs';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerImproveText: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: 'de' },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@ayunis/ui/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

afterEach(cleanup);

function submitButton(): HTMLButtonElement {
  return screen.getByTestId<HTMLButtonElement>('create-entity-submit');
}

function renderSkillDialog(isOwnerChoiceLoading: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SkillCreateDialog
        open
        onOpenChange={vi.fn()}
        onCreate={vi.fn()}
        isOwnerChoiceLoading={isOwnerChoiceLoading}
      />
    </QueryClientProvider>,
  );
  return submitButton();
}

function renderKnowledgeBaseDialog(isOwnerChoiceLoading: boolean) {
  render(
    <KnowledgeBaseCreateDialog
      onCreate={vi.fn()}
      buttonText="open"
      buttonTestId="open-dialog"
      isOwnerChoiceLoading={isOwnerChoiceLoading}
    />,
  );
  fireEvent.click(screen.getByTestId('open-dialog'));
  return submitButton();
}

describe('create dialogs while the owner choice loads', () => {
  it.each([
    ['skill', renderSkillDialog],
    ['knowledge base', renderKnowledgeBaseDialog],
  ] as const)(
    'keep %s creation disabled until the owners are known',
    (_, renderDialog) => {
      expect(renderDialog(true).disabled).toBe(true);
      cleanup();
      expect(renderDialog(false).disabled).toBe(false);
    },
  );
});
