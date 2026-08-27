import type { useSetSuperAdminSsoEnabled } from '@/pages/super-admin-settings/org/api/useSetSuperAdminSsoEnabled';
import EnableSsoDialog from '@/pages/super-admin-settings/org/ui/EnableSsoDialog';
import type { OrgSsoConnectionResponseDto } from '@/shared/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe(EnableSsoDialog.name, () => {
  it('shows the complete direct-routing mapping before activation', async () => {
    const connection: OrgSsoConnectionResponseDto = {
      id: '58d31b29-2801-4277-97b0-158258ef0bd5',
      orgId: 'f4fcdc42-176e-4d32-bd5b-6dad8d2426b4',
      emailDomain: 'example.com',
      domainVerifiedAt: '2026-08-27T12:00:00.000Z',
      zitadelOrgId: '385820595704561666',
      zitadelIdpId: '388145187060187138',
      enabled: false,
      jitProvisioningEnabled: false,
    };
    const mutation = {
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSetSuperAdminSsoEnabled>;

    render(
      <EnableSsoDialog
        orgId={connection.orgId}
        connection={connection}
        mutation={mutation}
      />,
    );
    fireEvent.click(screen.getByText('sso.enable.button'));

    expect(await screen.findByText(connection.zitadelIdpId!)).toBeTruthy();
  });
});
