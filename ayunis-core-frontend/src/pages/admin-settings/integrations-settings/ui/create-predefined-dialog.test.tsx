import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CreatePredefinedDialog } from './create-predefined-dialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@ayunis/ui/components/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? children : null,
  DialogContent: ({ children }: { children: ReactNode }) => children,
  DialogFooter: ({ children }: { children: ReactNode }) => children,
  DialogHeader: ({ children }: { children: ReactNode }) => children,
  DialogTitle: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@ayunis/ui/components/select', () => ({
  Select: ({ value }: { value?: string }) => (
    <output
      data-testid="integration-type-select"
      data-controlled={value !== undefined}
    />
  ),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock('../api/useCreatePredefinedIntegration', () => ({
  useCreatePredefinedIntegration: () => ({
    createPredefinedIntegration: vi.fn(),
    isCreating: false,
  }),
}));

describe('CreatePredefinedDialog', () => {
  it('controls the integration type select from its initial render', () => {
    render(
      <CreatePredefinedDialog
        open
        onOpenChange={vi.fn()}
        predefinedConfigs={[]}
        isCloud={false}
      />,
    );

    expect(
      screen.getByTestId('integration-type-select').dataset.controlled,
    ).toBe('true');
  });
});
