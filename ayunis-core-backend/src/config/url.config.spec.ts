import { urlConfig } from './url.config';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

describe('urlConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.URL_RETRIEVER_TIMEOUT_MS;
    delete process.env.URL_RETRIEVER_MAX_DOWNLOAD_BYTES;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the defaults when the env vars are unset', () => {
    const config = urlConfig();

    expect(config.timeout).toBe(DEFAULT_TIMEOUT_MS);
    expect(config.maxDownloadBytes).toBe(DEFAULT_MAX_DOWNLOAD_BYTES);
  });

  it('honors valid positive overrides', () => {
    process.env.URL_RETRIEVER_TIMEOUT_MS = '1000';
    process.env.URL_RETRIEVER_MAX_DOWNLOAD_BYTES = '1048576';

    const config = urlConfig();

    expect(config.timeout).toBe(1000);
    expect(config.maxDownloadBytes).toBe(1048576);
  });

  it.each(['0', '-5', 'not-a-number', ''])(
    'falls back to the defaults for the disabling/invalid value %p',
    (value) => {
      process.env.URL_RETRIEVER_TIMEOUT_MS = value;
      process.env.URL_RETRIEVER_MAX_DOWNLOAD_BYTES = value;

      const config = urlConfig();

      expect(config.timeout).toBe(DEFAULT_TIMEOUT_MS);
      expect(config.maxDownloadBytes).toBe(DEFAULT_MAX_DOWNLOAD_BYTES);
    },
  );
});
