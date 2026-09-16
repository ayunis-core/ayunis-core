import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function openDialog() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SkillCreateDialog onCreate={vi.fn()} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /buttonText/i }));
}

function glowOf(control: HTMLElement) {
  return control.closest('.processing-glow')?.className ?? '';
}

describe('skill create dialog glow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.improveText.mockReturnValue(new Promise(() => undefined));
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(cleanup);

  it('lights the trigger field while its own text is being rewritten', async () => {
    openDialog();
    const trigger = screen.getByPlaceholderText(
      'createDialog.form.shortDescriptionPlaceholder',
    );
    fireEvent.change(trigger, { target: { value: 'Immer wenn relevant' } });

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    await waitFor(() =>
      expect(glowOf(trigger)).toContain('processing-glow--active'),
    );
    // The other field's button must not clear the flag on the next render.
    await act(() => Promise.resolve());
    expect(glowOf(trigger)).toContain('processing-glow--active');
  });

  it('lights the instructions field while its own text is being rewritten', async () => {
    openDialog();
    const instructions = screen.getByPlaceholderText(
      'createDialog.form.instructionsPlaceholder',
    );
    fireEvent.change(instructions, { target: { value: 'Prüfe die Fristen.' } });

    fireEvent.click(screen.getByTestId('improve-skill-instructions'));

    await waitFor(() =>
      expect(glowOf(instructions)).toContain('processing-glow--active'),
    );
    await act(() => Promise.resolve());
    expect(glowOf(instructions)).toContain('processing-glow--active');
  });
});
