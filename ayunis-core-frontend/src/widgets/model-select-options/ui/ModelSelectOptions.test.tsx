import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModelOption } from './ModelSelectOptions';
import ModelSelectOptions from './ModelSelectOptions';

const viewport = vi.hoisted(() => ({ isMobile: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/hooks/use-mobile', () => ({
  useIsMobile: () => viewport.isMobile,
}));

vi.mock('@ayunis/ui/components/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverAnchor: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({
    children,
    side,
    className,
  }: {
    children: ReactNode;
    side?: string;
    className?: string;
  }) => (
    <div
      data-testid="model-info-popover"
      data-side={side}
      className={className}
    >
      {children}
    </div>
  ),
}));

vi.mock('@ayunis/ui/components/select', () => ({
  SelectGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    disabled,
    value: _value,
    ...props
  }: {
    children: ReactNode;
    disabled?: boolean;
    value: string;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props} data-disabled-prop={String(Boolean(disabled))} tabIndex={0}>
      {children}
    </div>
  ),
  SelectLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectSeparator: () => <hr />,
}));

vi.mock('./ModelProviderFaultIndicator', () => ({
  default: () => <span data-testid="model-provider-fault-indicator" />,
}));

vi.mock('./ModelModeInfoCard', () => ({
  default: ({ mode }: { mode: string }) => (
    <span data-testid={`mode-info-${mode}`} />
  ),
}));

const flaggedModel: ModelOption = {
  id: 'permitted-model-id',
  name: 'fault-test-model',
  provider: 'openai',
  displayName: 'Fault Test Model',
  hasProviderFault: true,
};

beforeEach(() => {
  viewport.isMobile = false;
});

describe(ModelSelectOptions.name, () => {
  it('requires an explicit opt-in before showing provider faults', () => {
    const { rerender } = render(<ModelSelectOptions models={[flaggedModel]} />);

    expect(screen.queryByTestId('model-provider-fault-indicator')).toBeNull();

    rerender(<ModelSelectOptions models={[flaggedModel]} showProviderFault />);

    expect(screen.getByTestId('model-provider-fault-indicator')).toBeDefined();
  });

  it('shows a mode without a matching model greyed out with the hint', () => {
    render(
      <ModelSelectOptions
        models={[{ ...flaggedModel, hasProviderFault: false }]}
        modes={[
          { mode: 'auto', disabled: false },
          { mode: 'max', disabled: true },
        ]}
        modesHint="no matching model"
      />,
    );

    const item = (label: string) =>
      screen.getByText(label).closest('[data-disabled-prop]');
    expect(item('models.modes.max.label')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(
      item('models.modes.auto.label')?.getAttribute('aria-disabled'),
    ).toBeNull();
    expect(screen.getByText('no matching model')).toBeDefined();
  });

  it('keeps an unavailable mode focusable and explains it on focus', () => {
    render(
      <ModelSelectOptions
        models={[{ ...flaggedModel, hasProviderFault: false }]}
        modes={[{ mode: 'max', disabled: true }]}
        modesHint="no matching model"
      />,
    );

    const item = screen
      .getByText('models.modes.max.label')
      .closest('[data-disabled-prop]');
    expect(item?.getAttribute('data-disabled-prop')).toBe('false');
    expect(item?.getAttribute('aria-disabled')).toBe('true');
    const descriptionId = item?.getAttribute('aria-describedby');
    expect(document.getElementById(descriptionId ?? '')?.textContent).toBe(
      'no matching model',
    );

    fireEvent.focus(item as HTMLElement);

    expect(screen.getByTestId('mode-info-max')).toBeDefined();
  });

  it('places the mode information above the menu within a phone viewport', () => {
    viewport.isMobile = true;

    render(
      <ModelSelectOptions
        models={[]}
        modes={[{ mode: 'max', disabled: true }]}
      />,
    );

    const popover = screen.getByTestId('model-info-popover');
    expect(popover.getAttribute('data-side')).toBe('top');
    expect(popover.className).toContain('w-[calc(100vw-2rem)]');
    expect(popover.className).toContain('max-w-80');
  });

  it('prevents pointer and keyboard selection of an unavailable mode', () => {
    render(
      <ModelSelectOptions
        models={[]}
        modes={[{ mode: 'max', disabled: true }]}
      />,
    );

    const item = screen
      .getByText('models.modes.max.label')
      .closest('[data-disabled-prop]') as HTMLElement;

    expect(fireEvent.pointerUp(item, { pointerType: 'mouse' })).toBe(false);
    expect(fireEvent.keyDown(item, { key: 'Enter' })).toBe(false);
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
