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

  describe('archive', () => {
    const revokedKey = {
      ...apiKey,
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Old export',
      revokedAt: '2026-09-01T10:00:00.000Z',
    };
    const expiredKey = {
      ...apiKey,
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Pilot',
      expiresAt: '2020-01-01T00:00:00.000Z',
    };

    it('keeps revoked and expired keys in a collapsed archive', () => {
      render(
        <ApiKeysList
          apiKeys={[revokedKey, apiKey, expiredKey]}
          creditLimits={[]}
        />,
      );

      expect(screen.getByTestId(`api-key-item-${apiKey.id}`)).toBeTruthy();
      expect(screen.queryByTestId(`api-key-item-${revokedKey.id}`)).toBeNull();
      expect(screen.queryByTestId(`api-key-item-${expiredKey.id}`)).toBeNull();
      expect(
        screen.getByTestId('api-key-archive-toggle').textContent,
      ).toContain('apiKeys.list.archiveTitle:{"count":2}');
    });

    it('shows archived keys without actions once the archive is opened', () => {
      render(
        <ApiKeysList
          apiKeys={[revokedKey, apiKey, expiredKey]}
          creditLimits={[]}
        />,
      );

      fireEvent.click(screen.getByTestId('api-key-archive-toggle'));

      const archive = screen.getByTestId('api-key-archive-list');
      const revokedItem = screen.getByTestId(`api-key-item-${revokedKey.id}`);
      const expiredItem = screen.getByTestId(`api-key-item-${expiredKey.id}`);
      expect(archive.contains(revokedItem)).toBe(true);
      expect(archive.contains(expiredItem)).toBe(true);
      expect(revokedItem.textContent).toContain('apiKeys.list.revokedBadge');
      expect(expiredItem.textContent).toContain('apiKeys.list.expiredBadge');
      expect(
        archive.querySelectorAll('[data-testid="api-key-actions-menu"]'),
      ).toHaveLength(0);
      expect(screen.getAllByTestId('api-key-actions-menu')).toHaveLength(1);
    });

    it('tells the admin when every key is archived', () => {
      render(<ApiKeysList apiKeys={[revokedKey]} creditLimits={[]} />);

      expect(screen.getByTestId('api-key-no-active')).toBeTruthy();
      expect(screen.getByTestId('api-key-archive-toggle')).toBeTruthy();
    });

    it('hides the archive when no key is archived', () => {
      render(<ApiKeysList apiKeys={[apiKey]} creditLimits={[]} />);

      expect(screen.queryByTestId('api-key-archive-toggle')).toBeNull();
      expect(screen.queryByTestId('api-key-no-active')).toBeNull();
    });
  });
});
