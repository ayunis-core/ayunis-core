import { describe, expect, it, vi } from 'vitest';
import { redirectToLogin } from './redirect-to-login';

describe('redirectToLogin', () => {
  it('preserves the current page so login can return to it', () => {
    const replace = vi.fn();

    redirectToLogin({
      pathname: '/chat/thread-1',
      search: '?panel=context',
      replace,
    });

    expect(replace).toHaveBeenCalledWith(
      '/login?redirect=%2Fchat%2Fthread-1%3Fpanel%3Dcontext',
    );
  });
});
