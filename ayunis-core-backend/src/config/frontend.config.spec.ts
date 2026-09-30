import { frontendConfig } from './frontend.config';

const OPENPANEL_API_URL = 'https://analytics.ayunis.de/api';
const OPENPANEL_CLIENT_ID = '928feccc-1d09-4e38-913d-6cc9093f49cc';

const originalApiUrl = process.env.VITE_OPENPANEL_API_URL;
const originalClientId = process.env.VITE_OPENPANEL_CLIENT_ID;
const originalAppEnvironment = process.env.APP_ENVIRONMENT;

function restoreEnvironment(): void {
  restoreValue('VITE_OPENPANEL_API_URL', originalApiUrl);
  restoreValue('VITE_OPENPANEL_CLIENT_ID', originalClientId);
  restoreValue('APP_ENVIRONMENT', originalAppEnvironment);
}

function restoreValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

describe('frontendConfig', () => {
  beforeEach(() => {
    delete process.env.VITE_OPENPANEL_API_URL;
    delete process.env.VITE_OPENPANEL_CLIENT_ID;
  });
  afterEach(restoreEnvironment);

  it('provides configured OpenPanel analytics values to the frontend', () => {
    process.env.VITE_OPENPANEL_API_URL = OPENPANEL_API_URL;
    process.env.VITE_OPENPANEL_CLIENT_ID = OPENPANEL_CLIENT_ID;

    const config = frontendConfig();

    expect(config).toMatchObject({
      VITE_OPENPANEL_API_URL: OPENPANEL_API_URL,
      VITE_OPENPANEL_CLIENT_ID: OPENPANEL_CLIENT_ID,
    });
  });

  it('does not provide OpenPanel configuration when it is unset', () => {
    process.env.APP_ENVIRONMENT = 'cloud';

    const config = frontendConfig();

    expect(config).not.toHaveProperty('VITE_OPENPANEL_API_URL');
    expect(config).not.toHaveProperty('VITE_OPENPANEL_CLIENT_ID');
  });
});
