import { isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';

const { isCloud } = vi.hoisted(() => ({ isCloud: vi.fn() }));

vi.mock('@/pages/auth/register', () => ({ default: () => null }));

vi.mock('@/shared/api', () => ({ appControllerIsCloud: isCloud }));

const { Route } = await import('./register');

async function runGuard(): Promise<unknown> {
  const beforeLoad = Route.options.beforeLoad as () => Promise<unknown>;
  try {
    return await beforeLoad();
  } catch (error) {
    if (isRedirect(error)) {
      return (error as unknown as { options: { to: string } }).options.to;
    }
    throw error;
  }
}

describe('register route', () => {
  it('sends cloud visitors to the login when registration is closed', async () => {
    isCloud.mockResolvedValue({ isCloud: true, isRegistrationDisabled: true });

    expect(await runGuard()).toBe('/login');
  });

  it('renders the form on cloud when registration is open', async () => {
    isCloud.mockResolvedValue({ isCloud: true, isRegistrationDisabled: false });

    expect(await runGuard()).toEqual({ isCloud: true });
  });

  // Self-hosted needs the form to create its first organisation.
  it('renders the form on self-hosted', async () => {
    isCloud.mockResolvedValue({ isCloud: false, isRegistrationDisabled: true });

    expect(await runGuard()).toEqual({ isCloud: false });
  });
});
