import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InviteResponseDto } from '@/shared/api';
import SuperAdminInvitesSection from './SuperAdminInvitesSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const invite: InviteResponseDto = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'pending@example.org',
  role: 'user',
  status: 'pending',
  sentDate: '2026-09-23T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
};

describe(SuperAdminInvitesSection.name, () => {
  it('shows pending invitations for the selected organization', () => {
    render(<SuperAdminInvitesSection invites={[invite]} total={1} />);

    expect(
      screen.getByTestId(`super-admin-invite-row-${invite.id}`),
    ).toBeTruthy();
    expect(screen.getByText(invite.email)).toBeTruthy();
    expect(screen.getByText('users.user')).toBeTruthy();
  });

  it('shows an empty state when the organization has no invitations', () => {
    render(<SuperAdminInvitesSection invites={[]} total={0} />);

    expect(screen.getByText('users.noInvitesFound')).toBeTruthy();
  });
});
