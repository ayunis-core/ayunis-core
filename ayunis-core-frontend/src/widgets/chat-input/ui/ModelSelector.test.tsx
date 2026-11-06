import type { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ModelSelector from './ModelSelector';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/usePermittedModels', () => ({
  usePermittedModels: () => ({
    models: [],
    placeholder: 'placeholder',
    isDisabled: false,
  }),
}));

vi.mock('@ayunis/ui/components/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./ModelSelectorMenu', () => ({
  ModelSelectorMenu: () => null,
}));

const glints = () => document.querySelectorAll('.max-shimmer__glint');

function renderSelector(isDisabled: boolean) {
  render(
    <ModelSelector
      isDisabled={isDisabled}
      isAnonymous={false}
      selectedModelId="mode:max"
      onModelChange={vi.fn()}
    />,
  );
}

afterEach(cleanup);

describe('ModelSelector', () => {
  it('lets Max shimmer while a model can still be chosen', () => {
    renderSelector(false);
    expect(glints()).toHaveLength(1);
  });

  it('keeps Max calm once the chat has started and the model is locked', () => {
    renderSelector(true);
    expect(glints()).toHaveLength(0);
  });
});
