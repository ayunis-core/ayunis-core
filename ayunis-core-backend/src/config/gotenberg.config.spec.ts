import { gotenbergConfig } from './gotenberg.config';

describe('gotenbergConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOTENBERG_URL;
    delete process.env.GOTENBERG_MAX_CONCURRENT_CONVERSIONS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps one conversion in flight unless told otherwise', () => {
    expect(gotenbergConfig().maxConcurrentConversions).toBe(1);
  });

  it('reads the conversion limit and url from the environment', () => {
    process.env.GOTENBERG_URL = 'https://gotenberg:3000';
    process.env.GOTENBERG_MAX_CONCURRENT_CONVERSIONS = '3';

    expect(gotenbergConfig()).toEqual({
      url: 'https://gotenberg:3000',
      maxConcurrentConversions: 3,
    });
  });
});
