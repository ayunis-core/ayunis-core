import { MarketplaceUnavailableError } from './marketplace.errors';

describe('MarketplaceUnavailableError', () => {
  it('returns an actionable 503 response that is safe to show clients', () => {
    const error = new MarketplaceUnavailableError();

    expect(error.statusCode).toBe(503);
    expect(error.toClientResponse()).toEqual({
      code: 'MARKETPLACE_UNAVAILABLE',
      message:
        'Marketplace service is currently unavailable. Please try again later.',
    });
  });
});
