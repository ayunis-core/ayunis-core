import { describe, expect, it } from 'vitest';
import {
  buildSsoStartUrl,
  rememberSsoPostLoginPath,
  resolveSsoStartUrl,
  takeSsoPostLoginPath,
} from '@/features/sso/lib/sso-navigation';

describe('buildSsoStartUrl', () => {
  const orgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4';

  it('uses the current origin with the production API path', () => {
    expect(buildSsoStartUrl('/api', orgId, 'https://core.ayunis.de')).toBe(
      `https://core.ayunis.de/api/auth/sso/organizations/${orgId}/start`,
    );
  });

  it('preserves an absolute development API origin', () => {
    expect(
      buildSsoStartUrl(
        'http://localhost:3050/api',
        orgId,
        'http://localhost:3051',
      ),
    ).toBe(`http://localhost:3050/api/auth/sso/organizations/${orgId}/start`);
  });

  it('routes malformed organization links to the fixed error page', () => {
    expect(
      resolveSsoStartUrl('/api', 'not-an-org-id', 'https://core.ayunis.de'),
    ).toBe(
      'https://core.ayunis.de/sso/error?code=SSO_CONNECTION_NOT_AVAILABLE',
    );
  });

  it('keeps a safe internal continuation for the completed login', () => {
    rememberSsoPostLoginPath('/settings/account');

    expect(takeSsoPostLoginPath()).toBe('/settings/account');
    expect(takeSsoPostLoginPath()).toBe('/chat');
  });

  it.each(['https://attacker.example', '//attacker.example'])(
    'rejects an external continuation: %s',
    (path) => {
      rememberSsoPostLoginPath(path);

      expect(takeSsoPostLoginPath()).toBe('/chat');
    },
  );
});
