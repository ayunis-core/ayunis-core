# Municipal SSO V1 onboarding and rollout

Use this operator-run procedure for every municipal SSO connection. Ayunis Core
owns the verified-domain-to-organization mapping, enablement, JIT policy, user
roles, and seat admission. Zitadel owns customer IdP credentials and metadata.
Never copy IdP secrets into Core, source control, Linear, or QA evidence.

## Collect and verify inputs

- Confirm the requester is authorized to configure SSO for the municipality.
- Verify control of the email domain independently of the supplied user account.
- Record the Ayunis organization UUID, verified domain, Zitadel organization
  ID, IdP type, named test users, and requested JIT policy in the onboarding
  record. IdP type is operational context and is not stored in Core.
- Receive OIDC credentials or SAML metadata and certificates only through the
  approved secure channel.
- Confirm production-readiness evidence from infrastructure: current database
  backup, successful restore test, monitoring and alerting, health checks,
  pinned broker image digest, and documented broker rollback. The
  [ayunis-core-auth deployment contract](https://github.com/ayunis-core/ayunis-core-auth/blob/main/docs/deployment-contract.md)
  defines that ownership boundary.

## Configure Zitadel

1. Select the correct staging or production broker.
2. Create one Zitadel organization for the Ayunis organization and record its
   immutable organization ID.
3. Add the external OIDC or SAML provider to that organization, never as an
   instance-wide provider. Use the callback or metadata values shown by the
   target broker.
4. Allow external login in the organization's login policy and activate the
   provider. Do not change instance defaults or the administration
   organization's policy.
5. Allow Zitadel to create or link its broker identity after successful
   external authentication. This does not create a Core user or grant a Core
   role.
6. Verify a login through the customer IdP directly at the target broker and
   review the returned email. Staging and production registrations are
   separate.

The shared Core OIDC application must use Core's callback URL,
`FRONTEND_BASEURL/login` as its exact registered post-logout redirect URI, and the public
`/api/auth/sso/oidc/backchannel-logout` endpoint as its back-channel logout URI.
Keep Core and Zitadel clocks synchronized; Core validates signed `auth_time`
against `SSO_REAUTH_MAX_AGE_SECONDS`.

## Configure Core

1. Sign in to Core as `SUPER_ADMIN`.
2. Open **Superadmin → Organizations → municipality → SSO**.
3. Enter the verified domain and Zitadel organization ID.
4. Confirm the domain and broker setup were reviewed, then save.
5. Set JIT independently. Invitations remain available whether JIT is on or
   off.
6. Review the saved mapping, choose **Enable SSO**, and confirm the exact domain
   and Zitadel organization ID shown in the dialog.

New connections are disabled. Controlled Core login while disabled is not part
of V1; test the customer IdP at Zitadel first, then enable Core only for the
agreed acceptance window. Local email and password authentication remains
available throughout.

## Acceptance test

Capture a pass or fail for every applicable row without recording credentials,
tokens, cookie values, or IdP secrets.

| Scenario | Expected result |
| --- | --- |
| Email-first login | The verified domain offers SSO and still offers Ayunis password login. |
| Direct link | `/sso/{orgId}` starts the same organization-pinned broker flow. |
| Disabled or unknown connection | SSO is unavailable and the user can return to local login. |
| Invited `USER` | SSO signs in the existing user and preserves `USER`. |
| Invited `MANAGER` | SSO signs in the existing user and preserves `MANAGER`. |
| Invited `ADMIN` | SSO signs in the existing user and preserves `ADMIN`. |
| Uninvited user, JIT off | Login is rejected; no Core user or federated identity is created. |
| Uninvited user, JIT on | One verified, passwordless Core `USER` and one federated identity are created. |
| No seat available | Login is rejected; no Core user or federated identity is created. |
| Invitation while JIT is on | The invitation can still be created and accepted. |
| Core MFA required | The user verifies or enrolls MFA unless the validated broker claim contains `mfa`. |
| Local password user | Existing local login and MFA behavior are unchanged. |
| Logout | The Core session is revoked; SSO sessions continue through broker logout. |

For the first production municipality, record the operator, date, environment,
Core organization ID, Zitadel organization ID, verified domain, IdP type, JIT
setting, seat state, test users' roles, and outcome of each row. Attach only
non-secret screenshots or logs to the reviewed change record.

## Rotation and mapping changes

1. Disable the Core connection before changing the domain, Zitadel organization
   mapping, OIDC client secret, SAML metadata, or signing certificate.
2. Rotate credentials through the approved secret channel and update Zitadel.
3. Verify the external IdP at Zitadel, review the Core mapping, and repeat the
   acceptance test before re-enabling.
4. Revoke superseded credentials at the customer IdP only after the new path is
   proven.

Do not delete the Core mapping, Zitadel organization, or identity links during
rotation.

## Incident response and rollback

1. Select **Disable SSO** in the organization's SSO tab. This preserves the
   mapping and immediately prevents new SSO starts; local login remains
   available.
2. If the incident is provider-specific, deactivate only that organization's
   provider in Zitadel. Do not weaken instance-wide policy.
3. Preserve the Zitadel organization, identity links, Core federated identity
   rows, and non-secret audit evidence for diagnosis.
4. Confirm existing SSO sessions are revoked through logout or expire within
   the configured absolute reauthentication window.
5. Restore service only after broker health, customer IdP login, the exact Core
   mapping, JIT policy, and seat state have been reviewed again.

Broker upgrades require reviewed release notes, a fresh database backup, a
tested rollback, controlled setup/migration execution, health and error-rate
monitoring, and a post-upgrade acceptance login before production rollout.
