import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiKeyUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ApiKeyUsageTableWidget } from './ApiKeyUsageTableWidget';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
    i18n: { language: 'en' },
  }),
}));

function buildApiKey(overrides: Partial<ApiKeyUsageDto>): ApiKeyUsageDto {
  return {
    apiKeyId: '11111111-1111-1111-1111-111111111111',
    name: 'Citizen portal',
    revokedAt: null,
    expiresAt: null,
    inputTokens: 1200,
    outputTokens: 300,
    totalTokens: 1500,
    requests: 4,
    credits: 12,
    unpricedRequests: 0,
    lastUsedAt: null,
    ...overrides,
  };
}

function renderRow(apiKey: ApiKeyUsageDto) {
  render(
    <ApiKeyUsageTableWidget
      apiKeys={[apiKey]}
      isLoading={false}
      error={null}
    />,
  );
  return screen.getByTestId(`api-key-usage-row-${apiKey.apiKeyId}`);
}

describe('ApiKeyUsageTableWidget', () => {
  it('shows tokens, requests and credits of a key', () => {
    const row = renderRow(buildApiKey({}));

    expect(
      within(row).getByTestId('api-key-usage-total-tokens').textContent,
    ).toBe('1.5K');
    expect(within(row).getByTestId('api-key-usage-requests').textContent).toBe(
      '4',
    );
    expect(within(row).getByTestId('api-key-usage-credits').textContent).toBe(
      '12',
    );
    expect(row.textContent).not.toContain('apiKeyUsage.status');
  });

  it('shows unavailable credits instead of zero when nothing was priced', () => {
    const row = renderRow(buildApiKey({ credits: null, unpricedRequests: 4 }));

    expect(within(row).getByTestId('api-key-usage-credits').textContent).toBe(
      'apiKeyUsage.creditsUnavailable',
    );
  });

  it('flags partially priced credits', () => {
    const row = renderRow(buildApiKey({ credits: 8, unpricedRequests: 1 }));

    expect(row.textContent).toContain(
      'apiKeyUsage.unpricedRequests:{"count":1}',
    );
  });

  it('marks revoked keys', () => {
    const revoked = renderRow(
      buildApiKey({ revokedAt: '2026-03-01T00:00:00.000Z' }),
    );
    expect(revoked.textContent).toContain('apiKeyUsage.status.revoked');
  });

  it('marks expired keys', () => {
    const expired = renderRow(
      buildApiKey({ expiresAt: '2020-01-01T00:00:00.000Z' }),
    );
    expect(expired.textContent).toContain('apiKeyUsage.status.expired');
  });

  it('shows an empty state when the organization has no keys', () => {
    render(
      <ApiKeyUsageTableWidget apiKeys={[]} isLoading={false} error={null} />,
    );

    expect(screen.getByText('apiKeyUsage.noKeys')).toBeTruthy();
  });
});
