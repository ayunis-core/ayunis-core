import { discoverSso } from '../../src/clients/api/auth.client';
import { test, expect } from '../../src/fixtures/test';

test('keeps SSO discovery available for organizations without SSO', async ({
  org,
  publicApi,
}) => {
  await expect(discoverSso(publicApi, org.admin.email)).resolves.toEqual({
    available: false,
  });
});
