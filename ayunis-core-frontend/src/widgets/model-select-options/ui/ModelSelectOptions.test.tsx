import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModelOption } from './ModelSelectOptions';
import ModelSelectOptions from './ModelSelectOptions';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/components/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverAnchor: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@ayunis/ui/components/select', () => ({
  SelectGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./ModelProviderFaultIndicator', () => ({
  default: () => <span data-testid="model-provider-fault-indicator" />,
}));

const flaggedModel: ModelOption = {
  id: 'permitted-model-id',
  name: 'fault-test-model',
  provider: 'openai',
  displayName: 'Fault Test Model',
  hasProviderFault: true,
};

describe(ModelSelectOptions.name, () => {
  it('requires an explicit opt-in before showing provider faults', () => {
    const { rerender } = render(<ModelSelectOptions models={[flaggedModel]} />);

    expect(screen.queryByTestId('model-provider-fault-indicator')).toBeNull();

    rerender(<ModelSelectOptions models={[flaggedModel]} showProviderFault />);

    expect(screen.getByTestId('model-provider-fault-indicator')).toBeDefined();
  });

  it('does not mark a healthy model when fault display is enabled', () => {
    render(
      <ModelSelectOptions
        models={[{ ...flaggedModel, hasProviderFault: false }]}
        showProviderFault
      />,
    );

    expect(screen.queryByTestId('model-provider-fault-indicator')).toBeNull();
  });
});
