import { extractionConfig } from './extraction.config';

describe('extractionConfig', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.EXTRACTION_SERVICE_URL;
    delete process.env.EXTRACTION_SERVICE_TOKEN;
    delete process.env.EXTRACTION_POLL_INTERVAL_MS;
  });

  afterAll(() => {
    process.env = env;
  });

  it('leaves the service disabled when the URL is unset or blank', () => {
    expect(extractionConfig().url).toBeUndefined();
    process.env.EXTRACTION_SERVICE_URL = '  ';
    expect(extractionConfig().url).toBeUndefined();
  });

  it('reads the service URL without a trailing slash and the optional token', () => {
    process.env.EXTRACTION_SERVICE_URL = 'https://extraction:8000/';
    process.env.EXTRACTION_SERVICE_TOKEN = 'secret';

    const config = extractionConfig();

    expect(config.url).toBe('https://extraction:8000');
    expect(config.token).toBe('secret');
  });

  it('polls every five seconds unless overridden', () => {
    expect(extractionConfig().pollIntervalMs).toBe(5000);
    process.env.EXTRACTION_POLL_INTERVAL_MS = '250';
    expect(extractionConfig().pollIntervalMs).toBe(250);
  });
});
