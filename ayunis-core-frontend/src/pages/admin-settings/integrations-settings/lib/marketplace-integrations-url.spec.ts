import { describe, expect, it } from 'vitest';
import { marketplaceIntegrationsUrl } from './marketplace-integrations-url';

describe('marketplaceIntegrationsUrl', () => {
  it.each(['https://marketplace.ayunis.de', 'https://marketplace.ayunis.de/'])(
    'links to the integrations of %s without a double slash',
    (url) => {
      expect(marketplaceIntegrationsUrl({ enabled: true, url })).toBe(
        'https://marketplace.ayunis.de/integrations',
      );
    },
  );

  it('links nowhere while the marketplace is disabled', () => {
    expect(
      marketplaceIntegrationsUrl({
        enabled: false,
        url: 'https://marketplace.ayunis.de',
      }),
    ).toBeNull();
  });
});
