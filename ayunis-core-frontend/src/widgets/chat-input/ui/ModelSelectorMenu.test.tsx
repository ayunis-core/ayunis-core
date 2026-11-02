import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { PermittedLanguageModelResponseDto } from '@/shared/api';
import { ModelSelectorMenu } from './ModelSelectorMenu';

const resolutions = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/features/useModelModes', () => ({
  useModelModes: () => ({ resolutions: resolutions.current }),
}));

const model = {
  id: 'mistral-large',
  provider: 'mistral',
  displayName: 'Mistral Large',
} as PermittedLanguageModelResponseDto;

function renderMenu() {
  render(
    <DropdownMenu open>
      <DropdownMenuTrigger>open</DropdownMenuTrigger>
      <DropdownMenuContent>
        <ModelSelectorMenu
          models={[model]}
          selectedValue={undefined}
          isAnonymous={false}
          onSelect={vi.fn()}
        />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

afterEach(cleanup);

describe('ModelSelectorMenu', () => {
  it('offers only modes that currently resolve to a model', () => {
    resolutions.current = [
      {
        mode: 'auto',
        permittedModelId: 'mistral-large',
        anonymousPermittedModelId: 'mistral-large',
      },
      { mode: 'max', permittedModelId: null, anonymousPermittedModelId: null },
    ];
    renderMenu();
    expect(screen.getByText('models.modes.auto.label')).toBeTruthy();
    expect(screen.queryByText('models.modes.max.label')).toBeNull();
  });

  it('lists the models directly while no mode resolves', () => {
    resolutions.current = [];
    renderMenu();
    expect(screen.queryByText('models.modes.heading')).toBeNull();
    expect(screen.queryByText('models.modes.moreModels')).toBeNull();
    expect(screen.getByTestId('chat-model-selector-model')).toBeTruthy();
  });

  it('keeps the models in a submenu while a mode is offered', () => {
    resolutions.current = [
      {
        mode: 'auto',
        permittedModelId: 'mistral-large',
        anonymousPermittedModelId: 'mistral-large',
      },
    ];
    renderMenu();
    expect(screen.getByText('models.modes.moreModels')).toBeTruthy();
  });
});
