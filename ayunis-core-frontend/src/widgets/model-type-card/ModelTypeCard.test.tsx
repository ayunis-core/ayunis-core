import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import ModelTypeCard from './ModelTypeCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/ui/provider-flag', () => ({
  ProviderFlag: () => null,
}));

function model(type: ModelWithConfigResponseDto['type']) {
  return {
    modelId: '123e4567-e89b-12d3-a456-426614174001',
    permittedModelId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'gpt-5.4',
    displayName: 'GPT 5.4',
    provider: 'azure',
    type,
    canStream: true,
    isReasoning: false,
    canUseTools: true,
    canVision: true,
    isPermitted: true,
    isDefault: false,
    anonymousOnly: false,
    internetAccessEnabled: true,
  } as ModelWithConfigResponseDto;
}

function actions(updatePermittedModel = vi.fn()) {
  return {
    deletePermittedModel: vi.fn(),
    updatePermittedModel,
    enableModel: vi.fn(),
    isEnabling: false,
  };
}

describe('ModelTypeCard', () => {
  it('offers internet access only for language models', () => {
    const { rerender } = render(
      <ModelTypeCard
        type="language"
        models={[model('language')]}
        actions={actions()}
      />,
    );
    expect(screen.getByText('models.internetAccess')).toBeTruthy();

    rerender(
      <ModelTypeCard
        type="embedding"
        models={[model('embedding')]}
        actions={actions()}
      />,
    );
    expect(screen.queryByText('models.internetAccess')).toBeNull();
  });

  it('updates internet access without sending anonymous mode', () => {
    const updatePermittedModel = vi.fn();
    render(
      <ModelTypeCard
        type="language"
        models={[model('language')]}
        actions={actions(updatePermittedModel)}
      />,
    );

    fireEvent.click(screen.getByLabelText('models.internetAccess'));

    expect(updatePermittedModel).toHaveBeenCalledWith({
      permittedModelId: '123e4567-e89b-12d3-a456-426614174002',
      internetAccessEnabled: false,
    });
  });
});
