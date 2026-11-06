import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import { OrgDefaultModelCardWidget } from './OrgDefaultModelCardWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/widgets/tooltip-if/ui/TooltipIf', () => ({
  default: ({
    condition,
    children,
  }: {
    condition: boolean;
    children: ReactNode;
  }) => (
    <div data-testid="default-model-tooltip" data-active={condition}>
      {children}
    </div>
  ),
}));

const defaultModel = {
  modelId: 'catalog-large',
  permittedModelId: 'permit-large',
  name: 'mistral-large',
  provider: 'mistral',
  displayName: 'Mistral Large',
  isPermitted: true,
  isDefault: true,
} as ModelWithConfigResponseDto;

function renderCard(
  modeIsLoading: boolean,
  models: ModelWithConfigResponseDto[] = [defaultModel],
) {
  render(
    <OrgDefaultModelCardWidget
      models={models}
      isLoading={false}
      isSaving={false}
      onDefaultModelChange={vi.fn()}
      modeDefault={{
        mode: null,
        currentPermittedModelId: null,
        availableModes: [],
        isLoading: modeIsLoading,
        isSaving: false,
        onModeChange: vi.fn(),
      }}
    />,
  );
  return screen.getByRole('combobox');
}

afterEach(cleanup);

describe('OrgDefaultModelCardWidget', () => {
  it('does not show the model default while the mode default is loading', () => {
    const trigger = renderCard(true);
    expect(trigger.textContent).not.toContain('Mistral Large');
    expect(trigger).toHaveProperty('disabled', true);
  });

  it('shows the model default once no mode default is set', () => {
    const trigger = renderCard(false);
    expect(trigger.textContent).toContain('Mistral Large');
  });

  it('keeps unavailable modes inspectable when no models are enabled', () => {
    const trigger = renderCard(false, []);

    expect(trigger).toHaveProperty('disabled', false);
  });

  it('does not cover the inspectable empty menu with a disabled-state tooltip', () => {
    renderCard(false, []);

    expect(
      screen.getByTestId('default-model-tooltip').getAttribute('data-active'),
    ).toBe('false');
  });
});
