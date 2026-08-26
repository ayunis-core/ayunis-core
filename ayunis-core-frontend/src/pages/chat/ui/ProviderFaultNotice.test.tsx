import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProviderFaultNotice from './ProviderFaultNotice';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { modelName?: string }) =>
      options?.modelName ? `${key}: ${options.modelName}` : key,
  }),
}));

describe(ProviderFaultNotice.name, () => {
  it('renders a compact localized warning naming the affected model', () => {
    render(<ProviderFaultNotice modelName="GPT-4 Test" />);

    const alert = screen.getByTestId('chat-model-provider-fault-alert');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain(
      'chat.modelProviderFaultWarning: GPT-4 Test',
    );
  });
});
