import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiKeysList } from './ApiKeysList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
}));

const mocks = vi.hoisted(() => ({
  removeApiKeyCreditLimit: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock('../api/useRemoveApiKeyCreditLimit', () => ({
  useRemoveApiKeyCreditLimit: () => ({
    removeApiKeyCreditLimit: mocks.removeApiKeyCreditLimit,
    isRemoving: false,
  }),
}));

vi.mock('../api/useRevokeApiKey', () => ({
  useRevokeApiKey: () => ({
    revokeApiKey: mocks.revokeApiKey,
    isRevoking: () => false,
  }),
}));

vi.mock('./SetApiKeyCreditLimitDialog', () => ({
  SetApiKeyCreditLimitDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="api-key-credit-limit-dialog" /> : null,
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

const creditLimit = {
  apiKeyId: apiKey.id,
  name: apiKey.name,
  monthlyCredits: 5000,
  creditsUsed: 1250,
};

describe('ApiKeysList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows current monthly consumption and configured limit', () => {
    render(<ApiKeysList apiKeys={[apiKey]} creditLimits={[creditLimit]} />);

    expect(screen.getByTestId('api-key-credit-usage').textContent).toContain(
      '1,250',
    );
    expect(screen.getByTestId('api-key-credit-usage').textContent).toContain(
      '5,000',
    );
  });

  it('opens credit-limit management from the actions menu', () => {
    render(<ApiKeysList apiKeys={[apiKey]} creditLimits={[creditLimit]} />);

    fireEvent.pointerDown(screen.getByTestId('api-key-actions-menu'), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.click(screen.getByTestId('api-key-credit-limit-manage'));

    expect(screen.getByTestId('api-key-credit-limit-dialog')).toBeTruthy();
  });

  it('removes a configured credit limit from the actions menu', () => {
    render(<ApiKeysList apiKeys={[apiKey]} creditLimits={[creditLimit]} />);

    fireEvent.pointerDown(screen.getByTestId('api-key-actions-menu'), {
      button: 0,
      ctrlKey: false,
    });
    const removeAction = screen.getByTestId('api-key-credit-limit-remove');
    expect(removeAction.getAttribute('data-variant')).toBe('destructive');
    fireEvent.click(removeAction);

    expect(mocks.removeApiKeyCreditLimit).toHaveBeenCalledWith(apiKey.id);
  });

  it('revokes an API key from the actions menu', () => {
    render(<ApiKeysList apiKeys={[apiKey]} creditLimits={[creditLimit]} />);

    fireEvent.pointerDown(screen.getByTestId('api-key-actions-menu'), {
      button: 0,
      ctrlKey: false,
    });
    const revokeAction = screen.getByTestId('api-key-revoke');
    expect(revokeAction.getAttribute('data-variant')).toBe('destructive');
    fireEvent.click(revokeAction);

    expect(mocks.revokeApiKey).toHaveBeenCalledWith(apiKey.id, apiKey.name);
  });
});
