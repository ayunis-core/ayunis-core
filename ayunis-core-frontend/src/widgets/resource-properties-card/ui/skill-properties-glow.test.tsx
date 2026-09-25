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

function renderCard(onUpdate = vi.fn()) {
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
        onUpdate={onUpdate}
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

  it('lights only the field whose text is being rewritten', async () => {
    renderCard();
    const trigger = screen.getByPlaceholderText(
      'properties.form.shortDescriptionPlaceholder',
    );
    const instructions = screen.getByPlaceholderText(
      'properties.form.instructionsPlaceholder',
    );

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    await waitFor(() =>
      expect(glowOf(trigger)).toContain('processing-glow--active'),
    );
    expect(glowOf(instructions)).not.toContain('processing-glow--active');
  });

  it('holds the field and the save button until the rewrite is back', async () => {
    renderCard();
    const trigger = screen.getByPlaceholderText<HTMLTextAreaElement>(
      'properties.form.shortDescriptionPlaceholder',
    );

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    await waitFor(() => expect(trigger.readOnly).toBe(true));
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'properties.buttons.save',
      }).disabled,
    ).toBe(true);
  });

  it('opens a field hint without submitting the form', async () => {
    const onUpdate = vi.fn();
    renderCard(onUpdate);

    fireEvent.click(screen.getByTestId('skill-trigger-hint'));
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(onUpdate).not.toHaveBeenCalled();
  });
});
