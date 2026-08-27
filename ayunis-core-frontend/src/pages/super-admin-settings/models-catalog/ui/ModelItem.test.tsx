import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LanguageModelResponseDtoProvider,
  LanguageModelResponseDtoType,
  type LanguageModelResponseDto,
} from '@/shared/api';
import { ModelItem } from './ModelItem';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const model: LanguageModelResponseDto = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'fault-test-model',
  provider: LanguageModelResponseDtoProvider.openai,
  displayName: 'Fault Test Model',
  type: LanguageModelResponseDtoType.language,
  isArchived: false,
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: false,
  hasProviderFault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe(ModelItem.name, () => {
  it('shows an auditable textual badge without selector punctuation', () => {
    render(
      <ModelItem
        model={model}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting={false}
      />,
    );

    const badge = screen.getByTestId('model-catalog-provider-fault-badge');
    expect(badge.textContent).toBe('models.catalog.providerFaultBadge');
    expect(badge.textContent).not.toContain('(!)');
  });
});
