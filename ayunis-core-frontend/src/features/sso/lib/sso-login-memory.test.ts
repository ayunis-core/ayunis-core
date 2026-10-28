import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetRememberedSsoOrgId,
  getRememberedSsoOrgId,
  rememberSsoAttempt,
  rememberSuccessfulSsoLogin,
} from '@/features/sso/lib/sso-login-memory';

const orgId = 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4';

describe('SSO login memory', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('remembers an organization only after SSO succeeds', () => {
    rememberSsoAttempt(orgId);

    expect(getRememberedSsoOrgId()).toBeNull();

    rememberSuccessfulSsoLogin();

    expect(getRememberedSsoOrgId()).toBe(orgId);
  });

  it('ignores a malformed pending organization identifier', () => {
    rememberSsoAttempt('not-an-organization-id');

    rememberSuccessfulSsoLogin();

    expect(getRememberedSsoOrgId()).toBeNull();
  });

  it('forgets the remembered organization', () => {
    rememberSsoAttempt(orgId);
    rememberSuccessfulSsoLogin();

    forgetRememberedSsoOrgId();

    expect(getRememberedSsoOrgId()).toBeNull();
  });

  it('keeps login usable when session storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(getRememberedSsoOrgId()).toBeNull();
  });
});
