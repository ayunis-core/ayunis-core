import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safe-redirect-path';

describe('safeRedirectPath', () => {
  it('keeps an in-app path', () => {
    expect(safeRedirectPath('/settings/account?tab=mfa')).toBe(
      '/settings/account?tab=mfa',
    );
  });

  it('falls back to the chat when there is no redirect', () => {
    expect(safeRedirectPath(undefined)).toBe('/chat');
    expect(safeRedirectPath('')).toBe('/chat');
  });

  it.each(['//evil.example/phish', '/\\evil.example/phish'])(
    'rejects the protocol-relative path %s',
    (path) => {
      expect(safeRedirectPath(path)).toBe('/chat');
    },
  );

  it.each(['https://evil.example/phish', 'data:text/html,evil', 'chat'])(
    'rejects the non-path destination %s',
    (destination) => {
      expect(safeRedirectPath(destination)).toBe('/chat');
    },
  );
});
