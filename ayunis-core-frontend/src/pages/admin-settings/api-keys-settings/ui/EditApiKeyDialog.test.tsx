import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditApiKeyDialog } from './EditApiKeyDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

const mocks = vi.hoisted(() => ({ updateApiKey: vi.fn() }));

vi.mock('@/pages/admin-settings/api-keys-settings/api/useUpdateApiKey', () => ({
  useUpdateApiKey: () => ({
    updateApiKey: mocks.updateApiKey,
    isUpdating: false,
  }),
}));

const apiKey = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Citizen portal',
  description: 'OptiGov connector',
  prefixPreview: 'ayk_live_abc...',
  expiresAt: null,
  revokedAt: null,
  createdByUserId: null,
  createdAt: '2026-08-30T10:00:00.000Z',
};

describe('EditApiKeyDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('prefills name and description of the key', () => {
    render(<EditApiKeyDialog apiKey={apiKey} onOpenChange={vi.fn()} />);

    expect(screen.getByTestId('api-key-edit-name')).toHaveProperty(
      'value',
      'Citizen portal',
    );
    expect(screen.getByTestId('api-key-edit-description')).toHaveProperty(
      'value',
      'OptiGov connector',
    );
  });

  it('saves the trimmed values', async () => {
    render(<EditApiKeyDialog apiKey={apiKey} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('api-key-edit-name'), {
      target: { value: '  Citizen portal v2  ' },
    });
    fireEvent.change(screen.getByTestId('api-key-edit-description'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('api-key-edit-save'));

    await waitFor(() =>
      expect(mocks.updateApiKey).toHaveBeenCalledWith(apiKey.id, {
        name: 'Citizen portal v2',
        description: '',
      }),
    );
  });

  it('does not save an empty name', async () => {
    render(<EditApiKeyDialog apiKey={apiKey} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByTestId('api-key-edit-name'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByTestId('api-key-edit-save'));

    expect(
      await screen.findByText('apiKeys.editDialog.nameRequired'),
    ).toBeTruthy();
    expect(mocks.updateApiKey).not.toHaveBeenCalled();
  });
});
