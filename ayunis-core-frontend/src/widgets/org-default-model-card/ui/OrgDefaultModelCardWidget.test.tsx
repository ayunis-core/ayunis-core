import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import { OrgDefaultModelCardWidget } from './OrgDefaultModelCardWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

function renderCard(modeIsLoading: boolean) {
  render(
    <OrgDefaultModelCardWidget
      models={[defaultModel]}
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
});
