import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ApiKeysSettingsPage } from './ApiKeysSettingsPage';
import type { ActiveSubscriptionResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/pages/admin-settings/admin-settings-layout', () => ({
  default: ({
    children,
    action,
    title,
  }: {
    children: ReactNode;
    action: ReactNode;
    title: string;
  }) => (
    <section>
      <h1>{title}</h1>
      {action}
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/help-link/HelpLink', () => ({
  HelpLink: () => <a href="/help">Help</a>,
}));

vi.mock('./ApiKeysList', () => ({
  ApiKeysList: () => null,
}));

vi.mock('./CreateApiKeyDialog', () => ({
  CreateApiKeyDialog: () => null,
}));

vi.mock('./RevealSecretDialog', () => ({
  RevealSecretDialog: () => null,
}));

const subscription = (
  overrides: Partial<ActiveSubscriptionResponseDto> = {},
): ActiveSubscriptionResponseDto => ({
  hasActiveSubscription: true,
  subscriptionType: 'USAGE_BASED',
  ...overrides,
});

describe('ApiKeysSettingsPage', () => {
  it('enables creation without a hint on a usage-based subscription', () => {
    render(
      <ApiKeysSettingsPage
        apiKeys={[]}
        creditLimits={[]}
        subscription={subscription()}
      />,
    );

    const createButton = screen.getByRole('button', {
      name: 'apiKeys.page.add',
    });
    expect(createButton.hasAttribute('disabled')).toBe(false);
    expect(
      screen.queryByText('apiKeys.createApiKey.subscriptionRequired'),
    ).toBeNull();
  });

  it('disables creation and shows the hint on a seat-based subscription', () => {
    render(
      <ApiKeysSettingsPage
        apiKeys={[]}
        creditLimits={[]}
        subscription={subscription({ subscriptionType: 'SEAT_BASED' })}
      />,
    );

    const createButton = screen.getByRole('button', {
      name: 'apiKeys.page.add',
    });
    expect(createButton.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText('apiKeys.createApiKey.subscriptionRequired'),
    ).toBeTruthy();
  });

  it('enables creation when there is no subscription type (self-hosted)', () => {
    render(
      <ApiKeysSettingsPage
        apiKeys={[]}
        creditLimits={[]}
        subscription={subscription({ subscriptionType: null })}
      />,
    );

    const createButton = screen.getByRole('button', {
      name: 'apiKeys.page.add',
    });
    expect(createButton.hasAttribute('disabled')).toBe(false);
    expect(
      screen.queryByText('apiKeys.createApiKey.subscriptionRequired'),
    ).toBeNull();
  });
});
