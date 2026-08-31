import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetApiKeyCreditLimitDialog } from './SetApiKeyCreditLimitDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mocks = vi.hoisted(() => ({ setApiKeyCreditLimit: vi.fn() }));

vi.mock('../api/useSetApiKeyCreditLimit', () => ({
  useSetApiKeyCreditLimit: () => ({
    setApiKeyCreditLimit: mocks.setApiKeyCreditLimit,
    isSaving: false,
  }),
}));

vi.mock('../api/useRemoveApiKeyCreditLimit', () => ({
  useRemoveApiKeyCreditLimit: () => ({
    removeApiKeyCreditLimit: vi.fn(),
    isRemoving: false,
  }),
}));

const apiKey = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Finance export',
  prefixPreview: 'ayk_live_abc...',
  expiresAt: null,
  revokedAt: null,
  orgId: '22222222-2222-2222-2222-222222222222',
  createdByUserId: null,
  createdAt: '2026-08-30T10:00:00.000Z',
};

describe('SetApiKeyCreditLimitDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires an explicit monthly credit value for a new limit', async () => {
    render(
      <SetApiKeyCreditLimitDialog
        apiKey={apiKey}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId<HTMLInputElement>('api-key-credit-limit-input').value,
    ).toBe('');

    fireEvent.click(screen.getByTestId('api-key-credit-limit-save'));

    expect(
      await screen.findByText('apiKeys.creditLimit.creditsRequired'),
    ).toBeTruthy();
    expect(mocks.setApiKeyCreditLimit).not.toHaveBeenCalled();
  });
});
