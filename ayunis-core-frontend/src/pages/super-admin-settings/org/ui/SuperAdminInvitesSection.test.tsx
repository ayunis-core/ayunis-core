import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InviteResponseDto } from '@/shared/api';
import SuperAdminInvitesSection from './SuperAdminInvitesSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const { confirm, mutate } = vi.hoisted(() => ({
  confirm: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm }),
}));
vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
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
    render(
      <SuperAdminInvitesSection
        orgId="selected-org"
        invites={[invite]}
        total={1}
      />,
    );

    const row = screen.getByTestId(`super-admin-invite-row-${invite.id}`);
    expect(row).toBeTruthy();
    expect(row.querySelector('[data-slot="badge"]')).toBeTruthy();
    expect(screen.getByText(invite.email)).toBeTruthy();
    expect(screen.getByText('users.user')).toBeTruthy();
  });

  it('shows an empty state when the organization has no invitations', () => {
    render(
      <SuperAdminInvitesSection orgId="selected-org" invites={[]} total={0} />,
    );

    expect(screen.getByText('users.noInvitesFound')).toBeTruthy();
  });
});

it('waits for confirmation before deleting one invite', () => {
  confirm.mockClear();
  mutate.mockClear();
  render(
    <SuperAdminInvitesSection
      orgId="selected-org"
      invites={[invite]}
      total={1}
    />,
  );
  fireEvent.click(screen.getByTestId(`super-admin-invite-delete-${invite.id}`));
  expect(mutate).not.toHaveBeenCalled();
  const options = confirm.mock.calls[0][0];
  expect(options.variant).toBe('destructive');
  options.onConfirm();
  expect(mutate).toHaveBeenCalledWith({
    orgId: 'selected-org',
    inviteId: invite.id,
  });
});

it('confirms deletion of all pending invites, including rows outside the current page', () => {
  confirm.mockClear();
  mutate.mockClear();
  render(
    <SuperAdminInvitesSection
      orgId="selected-org"
      invites={[invite]}
      total={12}
    />,
  );
  fireEvent.click(screen.getByTestId('super-admin-invites-delete-all'));
  expect(mutate).not.toHaveBeenCalled();
  confirm.mock.calls[0][0].onConfirm();
  expect(mutate).toHaveBeenCalledWith({ orgId: 'selected-org' });
});

it('keeps org-wide deletion available when a search matches no invites', () => {
  render(
    <SuperAdminInvitesSection orgId="selected-org" invites={[]} total={0} />,
  );
  expect(
    screen
      .getByTestId('super-admin-invites-delete-all')
      .hasAttribute('disabled'),
  ).toBe(false);
});
