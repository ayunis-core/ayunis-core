import type { ApiKeyUsageRow } from 'src/domain/usage/infrastructure/persistence/local-usage/queries/usage-query.types';
import { UsageQueryMapper } from './usage-query.mapper';

function buildRow(overrides: Partial<ApiKeyUsageRow>): ApiKeyUsageRow {
  return {
    apiKeyId: '22222222-2222-2222-2222-222222222222',
    name: 'Citizen portal',
    revokedAt: null,
    expiresAt: null,
    inputTokens: '0',
    outputTokens: '0',
    totalTokens: '0',
    requests: '0',
    pricedRequests: '0',
    credits: null,
    lastUsedAt: null,
    ...overrides,
  };
}

describe('UsageQueryMapper.mapApiKeyUsageRow', () => {
  const mapper = new UsageQueryMapper();

  it('reports zero credits for a key without usage', () => {
    const item = mapper.mapApiKeyUsageRow(buildRow({}));

    expect(item.requests).toBe(0);
    expect(item.credits).toBe(0);
    expect(item.unpricedRequests).toBe(0);
    expect(item.lastUsedAt).toBeNull();
  });

  it('reports unknown credits when no request could be priced', () => {
    const item = mapper.mapApiKeyUsageRow(
      buildRow({ requests: '3', pricedRequests: '0', credits: null }),
    );

    expect(item.credits).toBeNull();
    expect(item.unpricedRequests).toBe(3);
  });

  it('keeps a real zero credit sum for priced requests', () => {
    const item = mapper.mapApiKeyUsageRow(
      buildRow({ requests: '2', pricedRequests: '2', credits: '0.000000' }),
    );

    expect(item.credits).toBe(0);
    expect(item.unpricedRequests).toBe(0);
  });

  it('sums priced requests and counts the unpriced ones separately', () => {
    const item = mapper.mapApiKeyUsageRow(
      buildRow({
        inputTokens: '1500',
        outputTokens: '250',
        totalTokens: '1750',
        requests: '5',
        pricedRequests: '3',
        credits: '12.345678',
        revokedAt: '2026-03-20T10:00:00.000Z',
        lastUsedAt: '2026-03-19T09:30:00.000Z',
      }),
    );

    expect(item).toMatchObject({
      inputTokens: 1500,
      outputTokens: 250,
      totalTokens: 1750,
      requests: 5,
      credits: 12.345678,
      unpricedRequests: 2,
      revokedAt: new Date('2026-03-20T10:00:00.000Z'),
      lastUsedAt: new Date('2026-03-19T09:30:00.000Z'),
    });
  });
});
