import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invite } from '@/pages/auth/invite-accept/model/openapi';
import InviteAcceptPage from '@/pages/auth/invite-accept/ui/InviteAcceptPage';

const { beginSso, mutate, navigate } = vi.hoisted(() => ({
  beginSso: vi.fn(),
  mutate: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@/features/sso', () => ({
  beginSso,
}));

vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  useInvitesControllerAcceptInvite: () => ({
    mutate,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/layouts/onboarding-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

describe(InviteAcceptPage.name, () => {
  beforeEach(() => vi.clearAllMocks());

  it('continues through SSO without showing password registration for an SSO-only organization', async () => {
    renderPage({ localPasswordLoginEnabled: false });

    const continueButton = await screen.findByTestId('invite-accept-sso');
    expect(screen.queryByTestId('invite-accept-password')).toBeNull();
    expect(screen.queryByTestId('invite-accept-submit')).toBeNull();

    fireEvent.click(continueButton);
    expect(beginSso).toHaveBeenCalledWith(
      'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    );
  });

  it('preserves password invitation acceptance when local login is allowed', () => {
    renderPage({ localPasswordLoginEnabled: true });

    expect(screen.getByTestId('invite-accept-password')).toBeTruthy();
    expect(screen.getByTestId('invite-accept-submit')).toBeTruthy();
    expect(screen.queryByTestId('invite-accept-sso')).toBeNull();
  });
});

function renderPage(overrides: Partial<Invite> = {}) {
  return render(
    <InviteAcceptPage
      invite={invite(overrides)}
      inviteToken="invite-token"
      isCloud={false}
    />,
  );
}

function invite(overrides: Partial<Invite>): Invite {
  return {
    id: 'f532bbf9-1f0a-4a8d-b08b-4f2e8da09a7e',
    email: 'staff@stadt.example',
    role: 'user',
    status: 'pending',
    sentDate: '2026-09-01T10:00:00.000Z',
    expiresAt: '2026-09-08T10:00:00.000Z',
    organizationName: 'Stadt Example',
    orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
    localPasswordLoginEnabled: true,
    ...overrides,
  };
}
