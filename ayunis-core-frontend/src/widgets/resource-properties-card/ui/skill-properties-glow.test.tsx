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
import { SkillPropertiesCard } from './ResourcePropertiesCards';

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

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SkillPropertiesCard
        skill={{
          name: 'Fristenprüfung',
          shortDescription: 'Immer wenn relevant',
          instructions: 'Prüfe die Fristen.',
        }}
        onUpdate={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

function glowOf(control: HTMLElement) {
  return control.closest('.processing-glow')?.className ?? '';
}

describe('skill properties card glow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.improveText.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(cleanup);

  it('lights the trigger field while its own text is being rewritten', async () => {
    renderCard();
    const trigger = screen.getByPlaceholderText(
      'properties.form.shortDescriptionPlaceholder',
    );

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    await waitFor(() =>
      expect(glowOf(trigger)).toContain('processing-glow--active'),
    );
    // The other field's button must not clear the flag on the next render.
    await act(() => Promise.resolve());
    expect(glowOf(trigger)).toContain('processing-glow--active');
  });

  it('lights the instructions field while its own text is being rewritten', async () => {
    renderCard();
    const instructions = screen.getByPlaceholderText(
      'properties.form.instructionsPlaceholder',
    );

    fireEvent.click(screen.getByTestId('improve-skill-instructions'));

    await waitFor(() =>
      expect(glowOf(instructions)).toContain('processing-glow--active'),
    );
    await act(() => Promise.resolve());
    expect(glowOf(instructions)).toContain('processing-glow--active');
  });
});
