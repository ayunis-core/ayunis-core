import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LanguageModelResponseDtoProvider,
  LanguageModelResponseDtoType,
  type LanguageModelResponseDto,
} from '@/shared/api';
import { CreateLanguageModelDialog } from './CreateLanguageModelDialog';
import { EditLanguageModelDialog } from './EditLanguageModelDialog';

const { createLanguageModel, updateLanguageModel } = vi.hoisted(() => ({
  createLanguageModel: vi.fn(),
  updateLanguageModel: vi.fn(),
}));

vi.mock(
  '@/pages/super-admin-settings/models-catalog/api/useCreateLanguageModel',
  () => ({
    useCreateLanguageModel: () => ({
      createLanguageModel,
      isCreating: false,
    }),
  }),
);

vi.mock(
  '@/pages/super-admin-settings/models-catalog/api/useUpdateLanguageModel',
  () => ({
    useUpdateLanguageModel: () => ({
      updateLanguageModel,
      isUpdating: false,
    }),
  }),
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

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

describe('language model provider fault field', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to clear when creating and submits a marked fault', async () => {
    render(<CreateLanguageModelDialog open onOpenChange={vi.fn()} />);

    const checkbox = screen.getByTestId('model-catalog-provider-fault');
    expect(checkbox.getAttribute('data-state')).toBe('unchecked');

    fireEvent.click(checkbox);
    fireEvent.change(
      screen.getByPlaceholderText(
        'models.catalog.dialog.languageNamePlaceholder',
      ),
      { target: { value: 'fault-test-model' } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(
        'models.catalog.dialog.languageDisplayNamePlaceholder',
      ),
      { target: { value: 'Fault Test Model' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'models.catalog.dialog.create',
      }),
    );

    await waitFor(() => {
      expect(createLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({ hasProviderFault: true }),
      );
    });
  });

  it('hydrates the edit field and submits a cleared fault', async () => {
    render(
      <EditLanguageModelDialog model={model} open onOpenChange={vi.fn()} />,
    );

    const checkbox = screen.getByTestId('model-catalog-provider-fault');
    expect(checkbox.getAttribute('data-state')).toBe('checked');

    fireEvent.click(checkbox);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'models.catalog.dialog.update',
      }),
    );

    await waitFor(() => {
      expect(updateLanguageModel).toHaveBeenCalledWith(
        model.id,
        expect.objectContaining({ hasProviderFault: false }),
      );
    });
  });
});
