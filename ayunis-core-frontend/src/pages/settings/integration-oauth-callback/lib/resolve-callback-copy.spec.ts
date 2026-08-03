import { describe, expect, it } from 'vitest';
import { resolveOAuthCallbackCopy } from './resolve-callback-copy';

describe('resolveOAuthCallbackCopy', () => {
  it('returns success copy after completion', () => {
    expect(resolveOAuthCallbackCopy('success')).toEqual({
      title: 'integrations.oauth.callback.successTitle',
      description: 'integrations.oauth.callback.successDescription',
    });
  });

  it('returns generic error copy without provider-controlled text', () => {
    expect(resolveOAuthCallbackCopy('error')).toEqual({
      title: 'integrations.oauth.callback.errorTitle',
      description: 'integrations.oauth.callback.errorDescription',
    });
  });
});
