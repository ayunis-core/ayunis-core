import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillImproveButton } from './SkillImproveButton';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('@/features/skill-actions', () => ({
  useImproveSkillText: () => ({
    mutate: mocks.mutate,
    isPending: mocks.isPending,
  }),
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

function renderButton(
  props: Partial<Parameters<typeof SkillImproveButton>[0]> = {},
) {
  const onImproved = vi.fn();
  render(
    <SkillImproveButton
      field="trigger"
      name="Fristenprüfung"
      trigger="Immer wenn relevant"
      instructions="Prüfe die Fristen."
      onImproved={onImproved}
      {...props}
    />,
  );
  return { onImproved };
}

describe('SkillImproveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending = false;
  });

  afterEach(cleanup);

  it('sends both texts along so each can inform the other', () => {
    renderButton();

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        field: 'trigger',
        name: 'Fristenprüfung',
        trigger: 'Immer wenn relevant',
        instructions: 'Prüfe die Fristen.',
      },
      expect.anything(),
    );
  });

  it('stays disabled while its own field is empty', () => {
    renderButton({ trigger: '   ' });

    expect(
      screen.getByTestId('improve-skill-trigger').hasAttribute('disabled'),
    ).toBe(true);
  });

  it('offers to restore the previous text after an improvement', async () => {
    mocks.mutate.mockImplementation((_params, options) => {
      options.onSuccess('Wenn eine Frist im Bauantrag genannt wird.');
    });
    const { onImproved } = renderButton();

    fireEvent.click(screen.getByTestId('improve-skill-trigger'));

    expect(onImproved).toHaveBeenCalledWith(
      'Wenn eine Frist im Bauantrag genannt wird.',
    );
    const undo = await screen.findByText('improve.undo');

    fireEvent.click(undo);

    expect(onImproved).toHaveBeenLastCalledWith('Immer wenn relevant');
  });

  it('reports that it is working so the field can show it', async () => {
    const onPendingChange = vi.fn();
    mocks.isPending = true;
    renderButton({ onPendingChange });

    await waitFor(() => expect(onPendingChange).toHaveBeenCalledWith(true));
  });
});
