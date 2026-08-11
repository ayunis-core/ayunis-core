import type { OrgSsoConnection } from 'src/iam/sso/domain/org-sso-connection.entity';

export type SsoCommandAction =
  'configured' | 'enabled' | 'disabled' | 'jit_updated';

export function writeSsoCommandResult(
  action: SsoCommandAction,
  connection: OrgSsoConnection,
): void {
  process.stdout.write(
    `${JSON.stringify({
      action,
      orgId: connection.orgId,
      emailDomain: connection.emailDomain,
      domainVerifiedAt: connection.domainVerifiedAt,
      zitadelOrgId: connection.zitadelOrgId,
      enabled: connection.enabled,
      jitProvisioningEnabled: connection.jitProvisioningEnabled,
    })}\n`,
  );
}
