import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ModelProviderFaultIndicator from './ModelProviderFaultIndicator';

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

describe(ModelProviderFaultIndicator.name, () => {
  it('renders a yellow warning icon with an accessible label', () => {
    render(<ModelProviderFaultIndicator />);

    const indicator = screen.getByTestId('model-provider-fault-indicator');
    expect(indicator.textContent).not.toContain('(!)');
    expect(indicator.getAttribute('role')).toBe('img');
    expect(indicator.getAttribute('aria-label')).toBe(
      'models.providerFaultWarning',
    );
    expect(indicator.getAttribute('class')).toContain('text-warning');
    expect(indicator.getAttribute('class')).toContain(
      '[[data-slot=select-value]_&]:hidden',
    );
    expect(indicator.querySelector('svg')?.getAttribute('class')).toContain(
      'lucide-triangle-alert',
    );
  });

  it('shows the localized warning in a pointer tooltip', async () => {
    render(<ModelProviderFaultIndicator />);

    fireEvent.pointerMove(screen.getByTestId('model-provider-fault-indicator'));

    const tooltip = await screen.findByTestId('model-provider-fault-tooltip');
    expect(tooltip.textContent).toContain('models.providerFaultWarning');
  });
});
