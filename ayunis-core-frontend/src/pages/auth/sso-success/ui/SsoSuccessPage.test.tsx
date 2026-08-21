import { render, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SsoSuccessPage } from '@/pages/auth/sso-success/ui/SsoSuccessPage';

const { navigate, takeSsoPostLoginPath } = vi.hoisted(() => ({
  navigate: vi.fn(),
  takeSsoPostLoginPath: vi.fn(() => '/settings/account'),
}));

vi.mock('@/features/sso', () => ({ takeSsoPostLoginPath }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/layouts/onboarding-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

describe(SsoSuccessPage.name, () => {
  beforeEach(() => {
    navigate.mockClear();
    takeSsoPostLoginPath.mockReset();
    takeSsoPostLoginPath
      .mockReturnValueOnce('/settings/account')
      .mockReturnValue('/chat');
  });

  it('keeps the saved destination when Strict Mode replays the effect', async () => {
    render(
      <StrictMode>
        <SsoSuccessPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(2);
    });
    expect(takeSsoPostLoginPath).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenNthCalledWith(1, {
      to: '/settings/account',
      replace: true,
    });
    expect(navigate).toHaveBeenNthCalledWith(2, {
      to: '/settings/account',
      replace: true,
    });
  });
});
