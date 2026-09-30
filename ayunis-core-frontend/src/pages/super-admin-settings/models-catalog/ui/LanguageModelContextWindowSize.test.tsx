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
  name: 'context-test-model',
  provider: LanguageModelResponseDtoProvider.openai,
  displayName: 'Context Test Model',
  type: LanguageModelResponseDtoType.language,
  isArchived: false,
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: false,
  contextWindowSize: 128000,
  hasProviderFault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function fillRequiredCreateFields() {
  fireEvent.change(
    screen.getByPlaceholderText(
      'models.catalog.dialog.languageNamePlaceholder',
    ),
    { target: { value: 'context-test-model' } },
  );
  fireEvent.change(
    screen.getByPlaceholderText(
      'models.catalog.dialog.languageDisplayNamePlaceholder',
    ),
    { target: { value: 'Context Test Model' } },
  );
}

describe('language model context window size field', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits an omitted create value as undefined', async () => {
    render(<CreateLanguageModelDialog open onOpenChange={vi.fn()} />);
    fillRequiredCreateFields();

    expect(
      screen.getByTestId<HTMLInputElement>('model-catalog-context-window-size')
        .value,
    ).toBe('');

    fireEvent.click(
      screen.getByRole('button', { name: 'models.catalog.dialog.create' }),
    );

    await waitFor(() => {
      expect(createLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({ contextWindowSize: undefined }),
      );
    });
  });

  it('submits a context window size as a number', async () => {
    render(<CreateLanguageModelDialog open onOpenChange={vi.fn()} />);
    fillRequiredCreateFields();

    fireEvent.change(screen.getByTestId('model-catalog-context-window-size'), {
      target: { value: '128000' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'models.catalog.dialog.create' }),
    );

    await waitFor(() => {
      expect(createLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({ contextWindowSize: 128000 }),
      );
    });
  });

  it('hydrates and clears an existing edit value to undefined', async () => {
    render(
      <EditLanguageModelDialog model={model} open onOpenChange={vi.fn()} />,
    );

    const input = screen.getByTestId<HTMLInputElement>(
      'model-catalog-context-window-size',
    );
    expect(input.value).toBe('128000');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(
      screen.getByRole('button', { name: 'models.catalog.dialog.update' }),
    );

    await waitFor(() => {
      expect(updateLanguageModel).toHaveBeenCalledWith(
        model.id,
        expect.objectContaining({ contextWindowSize: undefined }),
      );
    });
  });

  it('submits an edited context window size as a number', async () => {
    render(
      <EditLanguageModelDialog model={model} open onOpenChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByTestId('model-catalog-context-window-size'), {
      target: { value: '64000' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'models.catalog.dialog.update' }),
    );

    await waitFor(() => {
      expect(updateLanguageModel).toHaveBeenCalledWith(
        model.id,
        expect.objectContaining({ contextWindowSize: 64000 }),
      );
    });
  });

  it('rejects a fractional context window size', async () => {
    render(<CreateLanguageModelDialog open onOpenChange={vi.fn()} />);
    fillRequiredCreateFields();

    const input = screen.getByTestId('model-catalog-context-window-size');
    fireEvent.change(input, { target: { value: '1.5' } });
    fireEvent.submit(input.closest('form')!);

    expect(
      await screen.findByText(
        'models.catalog.validation.contextWindowSize.isInt',
      ),
    ).toBeTruthy();
    expect(createLanguageModel).not.toHaveBeenCalled();
  });

  it('rejects a non-positive context window size', async () => {
    render(<CreateLanguageModelDialog open onOpenChange={vi.fn()} />);
    fillRequiredCreateFields();

    const input = screen.getByTestId('model-catalog-context-window-size');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.submit(input.closest('form')!);

    expect(
      await screen.findByText(
        'models.catalog.validation.contextWindowSize.min',
      ),
    ).toBeTruthy();
    expect(createLanguageModel).not.toHaveBeenCalled();
  });
});
