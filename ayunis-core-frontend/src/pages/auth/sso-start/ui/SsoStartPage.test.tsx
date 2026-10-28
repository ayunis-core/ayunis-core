import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SsoStartPage } from '@/pages/auth/sso-start/ui/SsoStartPage';

const { beginSso, discover, showSsoConnectionUnavailable } = vi.hoisted(() => ({
  beginSso: vi.fn(),
  discover: vi.fn(),
  showSsoConnectionUnavailable: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  beginSso,
  showSsoConnectionUnavailable,
  useDiscoverSso: () => ({ discover, isPending: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/layouts/onboarding-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

describe(SsoStartPage.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves a customer domain before starting SSO', async () => {
    discover.mockResolvedValue({
      available: true,
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    });

    render(<SsoStartPage identifier="qa-stadt.local" />);

    await waitFor(() => {
      expect(discover).toHaveBeenCalledWith('sso@qa-stadt.local');
      expect(beginSso).toHaveBeenCalledWith(
        'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      );
    });
  });

  it('keeps existing organization UUID links working', () => {
    render(<SsoStartPage identifier="f4fcdc42-176e-4d32-bd5b-6dad8d2426b4" />);

    expect(discover).not.toHaveBeenCalled();
    expect(beginSso).toHaveBeenCalledWith(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    );
  });

  it('shows the fixed error route when the domain has no SSO connection', async () => {
    discover.mockResolvedValue({ available: false });

    render(<SsoStartPage identifier="unknown.example" />);

    await waitFor(() => {
      expect(showSsoConnectionUnavailable).toHaveBeenCalledOnce();
    });
    expect(beginSso).not.toHaveBeenCalled();
  });

  it('shows the fixed error route when discovery fails', async () => {
    discover.mockRejectedValue(new Error('network unavailable'));

    render(<SsoStartPage identifier="qa-stadt.local" />);

    await waitFor(() => {
      expect(showSsoConnectionUnavailable).toHaveBeenCalledOnce();
    });
    expect(beginSso).not.toHaveBeenCalled();
  });
});
