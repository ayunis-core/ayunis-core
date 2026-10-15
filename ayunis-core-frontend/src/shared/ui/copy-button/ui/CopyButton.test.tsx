import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showError, showSuccess } from '@/shared/lib/toast';
import { CopyButton } from './CopyButton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { label: string }) =>
      params ? `${key}:${params.label}` : key,
  }),
}));

vi.mock('@/shared/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('CopyButton', () => {
  afterEach(() => vi.clearAllMocks());

  it('copies the value and confirms it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<CopyButton value="org-123" label="ID" testId="copy" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'common.copy.label:ID' }),
    );

    await waitFor(() =>
      expect(showSuccess).toHaveBeenCalledWith('common.copy.success'),
    );
    expect(writeText).toHaveBeenCalledWith('org-123');
    expect(showError).not.toHaveBeenCalled();
  });

  it('reports a failed clipboard write', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    render(<CopyButton value="org-123" label="ID" testId="copy" />);

    fireEvent.click(screen.getByTestId('copy'));

    await waitFor(() =>
      expect(showError).toHaveBeenCalledWith('common.copy.error'),
    );
    expect(showSuccess).not.toHaveBeenCalled();
  });
});
