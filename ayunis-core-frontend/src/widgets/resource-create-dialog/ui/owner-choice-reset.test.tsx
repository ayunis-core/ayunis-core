import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OwnerOption } from '@/features/resource-ownership';
import {
  KnowledgeBaseCreateDialog,
  SkillCreateDialog,
} from './ResourceCreateDialogs';

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerImproveText: vi.fn(),
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: 'de' },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const ownerOptions: OwnerOption[] = [
  { key: 'personal', selection: { ownerType: 'personal' }, label: 'Personal' },
  { key: 'org', selection: { ownerType: 'org' }, label: 'Organisation' },
];

beforeAll(() => {
  // Radix Select relies on pointer capture and scrolling, which jsdom lacks.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(cleanup);

describe('knowledge-base create dialog owner choice', () => {
  it('starts with the personal owner again after closing with Escape', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <KnowledgeBaseCreateDialog
        onCreate={onCreate}
        ownerOptions={ownerOptions}
        buttonText="open"
        buttonTestId="open-dialog"
      />,
    );

    fireEvent.click(screen.getByTestId('open-dialog'));
    fireEvent.keyDown(screen.getByTestId('knowledge-base-create-owner'), {
      key: 'Enter',
    });
    fireEvent.click(
      await screen.findByTestId('knowledge-base-create-owner-option-org'),
    );
    expect(
      screen.getByTestId('knowledge-base-create-owner').textContent,
    ).toContain('Organisation');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    fireEvent.click(screen.getByTestId('open-dialog'));
    expect(
      screen.getByTestId('knowledge-base-create-owner').textContent,
    ).toContain('Personal');

    fireEvent.change(screen.getByTestId('entity-form-name'), {
      target: { value: 'Bauordnung' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-entity-submit'));
    });
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ owner: { ownerType: 'personal' } }),
    );
  });

  it('starts the skill dialog with the personal owner again after Escape', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <QueryClientProvider client={new QueryClient()}>
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
          <SkillCreateDialog
            open={open}
            onOpenChange={setOpen}
            onCreate={vi.fn()}
            ownerOptions={ownerOptions}
          />
        </QueryClientProvider>
      );
    }
    render(<Harness />);
    const owner = () => screen.getByTestId('skill-create-owner');

    fireEvent.click(screen.getByText('open'));
    fireEvent.keyDown(owner(), { key: 'Enter' });
    fireEvent.click(await screen.findByTestId('skill-create-owner-option-org'));
    expect(owner().textContent).toContain('Organisation');

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    fireEvent.click(screen.getByText('open'));
    expect(owner().textContent).toContain('Personal');
  });
});
