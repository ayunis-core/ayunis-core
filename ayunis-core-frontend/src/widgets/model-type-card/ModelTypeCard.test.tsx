import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import ModelTypeCard, { type ModelActions } from './ModelTypeCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const model = (
  modelId: string,
  isPermitted: boolean,
): ModelWithConfigResponseDto => ({
  modelId,
  permittedModelId: isPermitted ? `permit-${modelId}` : null,
  name: `model-${modelId}`,
  provider: 'azure',
  displayName: `Model ${modelId}`,
  type: 'image-generation',
  canStream: false,
  isReasoning: false,
  canUseTools: false,
  canVision: false,
  isPermitted,
  isDefault: false,
  anonymousOnly: isPermitted ? false : null,
});

const actions = (): ModelActions => ({
  enableModel: vi.fn(),
  deletePermittedModel: vi.fn(),
  isEnabling: false,
  isDisabling: false,
});

describe(ModelTypeCard.name, () => {
  it('adds stable selectors only when a prefix is supplied', () => {
    const { rerender } = render(
      <ModelTypeCard
        type="image-generation"
        models={[model('selected', true)]}
        actions={actions()}
        testIdPrefix="team-model"
      />,
    );

    expect(screen.getByTestId('team-model-image-generation-card')).toBeTruthy();
    expect(screen.getByTestId('team-model-selected-toggle')).toBeTruthy();

    rerender(
      <ModelTypeCard
        type="image-generation"
        models={[model('selected', true)]}
        actions={actions()}
      />,
    );
    expect(screen.queryByTestId('team-model-image-generation-card')).toBeNull();
  });

  it('lets callers disable alternatives while keeping the selected model removable', () => {
    const modelActions = actions();
    render(
      <ModelTypeCard
        type="image-generation"
        models={[model('selected', true), model('alternative', false)]}
        actions={modelActions}
        testIdPrefix="team-model"
        isToggleDisabled={(item) => !item.isPermitted}
      />,
    );

    const selected = screen.getByTestId('team-model-selected-toggle');
    const alternative = screen.getByTestId('team-model-alternative-toggle');
    expect(selected.hasAttribute('disabled')).toBe(false);
    expect(alternative.hasAttribute('disabled')).toBe(true);

    fireEvent.click(selected);
    expect(modelActions.deletePermittedModel).toHaveBeenCalledWith(
      'permit-selected',
    );
  });
});
