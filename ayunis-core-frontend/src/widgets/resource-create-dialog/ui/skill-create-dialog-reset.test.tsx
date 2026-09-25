import { useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SkillCreateDialog } from './ResourceCreateDialogs';

const mocks = vi.hoisted(() => ({
  improveText: vi.fn(),
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  skillsControllerImproveText: mocks.improveText,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      <SkillCreateDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={vi.fn()}
      />
    </>
  );
}

function trigger() {
  return screen.getByPlaceholderText<HTMLTextAreaElement>(
    'createDialog.form.shortDescriptionPlaceholder',
  );
}

afterEach(cleanup);

describe('skill create dialog', () => {
  it('drops a rewrite that comes back after the dialog was cancelled', async () => {
    let answer!: (value: { text: string }) => void;
    mocks.improveText.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Harness />
      </QueryClientProvider>,
    );

    fireEvent.change(trigger(), { target: { value: 'Immer wenn relevant' } });
    fireEvent.click(screen.getByTestId('improve-skill-trigger'));
    fireEvent.click(
      screen.getByRole('button', { name: 'createDialog.buttons.cancel' }),
    );
    await act(async () => answer({ text: 'Bei Fristen im Bauantrag.' }));
    fireEvent.click(screen.getByRole('button', { name: 'reopen' }));

    expect(trigger().value).toBe('');
  });

  it('keeps the draft but drops a running rewrite when the dialog is dismissed', async () => {
    let answer!: (value: { text: string }) => void;
    mocks.improveText.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Harness />
      </QueryClientProvider>,
    );

    fireEvent.change(trigger(), { target: { value: 'Immer wenn relevant' } });
    fireEvent.click(screen.getByTestId('improve-skill-trigger'));
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    await act(async () => answer({ text: 'Bei Fristen im Bauantrag.' }));
    fireEvent.click(screen.getByRole('button', { name: 'reopen' }));

    expect(trigger().value).toBe('Immer wenn relevant');
  });
});
