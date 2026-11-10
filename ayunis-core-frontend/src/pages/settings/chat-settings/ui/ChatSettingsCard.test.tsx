import type { HTMLAttributes, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSettingsCard } from './ChatSettingsCard';

const state = vi.hoisted(() => ({
  availableModes: ['auto', 'max'],
  defaultMode: null as 'auto' | 'max' | null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@ayunis/ui/components/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverAnchor: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@ayunis/ui/components/select', () => ({
  Select: ({ children, value }: { children: ReactNode; value?: string }) => (
    <div data-testid="default-model-select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
    ...props
  }: {
    children: ReactNode;
    value: string;
  } & HTMLAttributes<HTMLDivElement>) => (
    <div data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectLabel: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectSeparator: () => <hr />,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: () => null,
}));

vi.mock('@/features/usePermittedModels', () => ({
  usePermittedModels: () => ({ models: [], isLoading: false }),
}));

vi.mock('@/pages/settings/chat-settings/api/useUserDefaultModel', () => ({
  useUserDefaultModel: () => ({
    userDefaultModel: null,
    manageUserDefaultModel: vi.fn(),
    deleteUserDefaultModel: vi.fn(),
  }),
}));

vi.mock('@/features/useModelModes', () => ({
  useModelModes: () => ({ resolutions: [] }),
}));

vi.mock('@/features/model-mode-defaults', () => ({
  useModelModeDefault: () => ({
    mode: state.defaultMode,
    availableModes: state.availableModes,
    setMode: vi.fn(),
    isLoading: false,
  }),
}));

function modeOption(mode: 'auto' | 'max') {
  return screen.getByText(`models.modes.${mode}.label`).closest('[data-value]');
}

beforeEach(() => {
  state.availableModes = ['auto', 'max'];
  state.defaultMode = null;
});

afterEach(cleanup);

describe(ChatSettingsCard.name, () => {
  it('lists Auto and Max as available when both modes resolve', () => {
    render(<ChatSettingsCard />);

    expect(modeOption('auto')?.getAttribute('aria-disabled')).toBeNull();
    expect(modeOption('max')?.getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByText('chat.modesUnavailable.auto')).toBeNull();
    expect(screen.queryByText('chat.modesUnavailable.max')).toBeNull();
    expect(screen.queryByText('chat.modesUnavailable.both')).toBeNull();
  });

  it('keeps one unavailable mode visible and explains why it is disabled', () => {
    state.availableModes = ['auto'];

    render(<ChatSettingsCard />);

    expect(modeOption('auto')?.getAttribute('aria-disabled')).toBeNull();
    expect(modeOption('max')?.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('chat.modesUnavailable.max')).toBeDefined();
  });

  it('keeps both modes visible with a combined hint when neither resolves', () => {
    state.availableModes = [];

    render(<ChatSettingsCard />);

    expect(modeOption('auto')?.getAttribute('aria-disabled')).toBe('true');
    expect(modeOption('max')?.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('chat.modesUnavailable.both')).toBeDefined();
  });

  it('keeps a saved mode selected and disabled after it stops resolving', () => {
    state.defaultMode = 'max';
    state.availableModes = ['auto'];

    render(<ChatSettingsCard />);

    expect(
      screen.getByTestId('default-model-select').getAttribute('data-value'),
    ).toBe('mode:max');
    expect(modeOption('max')?.getAttribute('aria-disabled')).toBe('true');
  });
});
