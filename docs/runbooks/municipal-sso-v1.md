# Municipal SSO V1 onboarding and rollout

Use this operator-run procedure for every municipal SSO connection. Ayunis Core
owns the verified-domain-to-organization mappings, enablement, JIT policy, user
roles, and seat admission. Zitadel owns customer IdP credentials and metadata.
Never copy IdP secrets into Core, source control, Linear, or QA evidence.

Share the [customer SSO setup guide](../guides/customer-sso-setup.md) with the
customer's IT team for the non-technical requirements and onboarding checklist.

## Collect and verify inputs

- Confirm the requester is authorized to configure SSO for the municipality.
- Verify control of every email domain independently of the supplied user account.
- Record the Ayunis organization UUID, verified domains, Zitadel organization
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
   target broker. For Entra ID, follow the Microsoft-specific steps below.
4. Allow external login in the organization's login policy and activate the
   provider. Do not change instance defaults or the administration
   organization's policy.
5. Allow Zitadel to create or link its broker identity after successful
   external authentication. This does not create a Core user or grant a Core
   role.
6. Verify a login through the customer IdP directly at the target broker and
   review the returned email and its verified status. Record the provider's
   immutable identity provider ID as well as the Zitadel organization ID.
   Staging and production registrations are separate.

### Identify the correct IDs and callback

The customer IdP authenticates to Zitadel; Zitadel authenticates to Core.
These are two separate connections:

| Value | Owner and use |
| --- | --- |
| Application (client) ID | Customer's Entra app registration; enter in the Zitadel Microsoft provider's **Client ID** field. Never use an Object ID or Secret ID. |
| Directory (tenant) ID | Customer's Entra directory; enter in the Microsoft provider's **Tenant ID** field. |
| Client secret value | Customer's app credential; store only in Zitadel. The Secret ID is not a credential. |
| Zitadel organization ID | Our broker organization for the customer; enter in Core's SSO mapping. |
| Zitadel identity provider ID | Our customer-specific provider connection; enter in Core for direct IdP routing. Copy from the saved provider's details or its provider-specific URL. |

Copy the upstream callback from the target broker's provider form, selecting
the version used by that environment. For ordinary OIDC redirects the formats
are:

| Broker login version | Customer registers this redirect URI |
| --- | --- |
| Login V1 | `https://<broker-host>/ui/login/login/externalidp/callback` |
| Login V2 | `https://<broker-host>/idps/callback` |

The repeated `/login/login/` in V1 is intentional. SAML uses the provider's
displayed ACS and metadata URLs instead. Customers must not register Core's
`/api/auth/sso/oidc/callback` as their upstream IdP callback; that belongs to
the shared Core application in Zitadel. Do not infer deployed hostnames from
examples or mix staging and production values. See
[Zitadel's callback version reference](https://zitadel.com/docs/guides/integrate/login-ui/external-login).

### Microsoft Entra ID provider

For a new standard Entra workforce connection, select **Microsoft** in the
customer's organization. Generic OIDC remains an option for reviewed setups;
do not replace a working connection simply because its issuer is Microsoft.

Expand **optional** below the credentials and review these fields:

| Field | Setting |
| --- | --- |
| Name | Recognizable display label; it need not match the Entra app name. |
| Client ID / Client Secret | Customer's Application (client) ID and secret **value** for that same app. |
| Tenant Type / Tenant ID | **Tenant ID** and the customer's Directory (tenant) ID. |
| Scopes | `openid profile email User.Read`; the Microsoft template always sends `openid` and `User.Read`, even when only the first three are entered. |
| Email verified | Enable only after reviewing trust in this specific customer's tenant and approved email domains. This is our Zitadel setting. |
| Account creation allowed / Automatic creation | Allow first-time broker identities according to the onboarding plan; this does not enable Core JIT. |
| Automatic update | Review whether subsequent external logins should update existing broker profiles. |

Ask the customer's IT to confirm delegated Graph permissions `openid`,
`profile`, `email`, and `User.Read`, consent under their tenant policy, and
the email/name claims described in
[Zitadel's Microsoft setup guide](https://zitadel.com/docs/guides/integrate/identity-providers/azure-ad-oidc).
This setup does not call for application permissions or directory-wide read
access. Microsoft's template behavior must not be assumed for Generic OIDC.

### Verify new and existing broker users

Core requires Zitadel's UserInfo response to contain a valid email and
`email_verified: true`. A successful Microsoft login alone does not prove
Core admission. Entra users created without the provider's **Email verified**
setting can have an unverified email in Zitadel.

After changing that setting, test both a first-time user and any user created
before the correction. Inspect the existing user's actual email verification
status in Zitadel after a fresh external sign-in. Do not assume a provider
setting change retroactively updates stored users. If the status remains
unverified, use the supported email-verification flow or a reviewed profile
update after establishing ownership; never bulk-verify users just to clear an
error. Preserve their users and identity links rather than deleting and
recreating them.

The shared Core OIDC application must use Core's callback URL,
`FRONTEND_BASEURL/login` as its exact registered post-logout redirect URI, and the public
`/api/auth/sso/oidc/backchannel-logout` endpoint as its back-channel logout URI.
Keep Core and Zitadel clocks synchronized; Core validates signed `auth_time`
against `SSO_REAUTH_MAX_AGE_SECONDS`.

## Configure Core

During the first deployment of multi-domain support, pause SSO mapping changes
until every Core backend replica runs the new version. The migration backfills
existing mappings, and the new version keeps the legacy primary-domain column
in sync for rollback compatibility.

1. Sign in to Core as `SUPER_ADMIN`.
2. Open **Superadmin → Organizations → municipality → SSO**.
3. Enter every verified domain, the Zitadel organization ID, and the saved
   identity provider ID for direct routing. The latter is not the customer's
   Entra client or tenant ID.
4. Confirm the domains and broker setup were reviewed, then save.
5. Set JIT independently. Invitations remain available whether JIT is on or
   off.
6. Review the saved mapping, choose **Enable SSO**, and confirm the exact domains
   and Zitadel organization ID shown in the dialog.
7. Complete the acceptance test with local password login still available.
8. If the organization requires SSO-only login, explicitly enable **Require
   SSO** and confirm the exact current domains and broker identifiers. This
   revokes password-origin sessions but preserves password hashes. Existing
   accounts with the configured domains in another Core organization block this
   change; resolve their membership before enforcing SSO-only.

New connections are disabled. Controlled Core login while disabled is not part
of V1; test the customer IdP at Zitadel first, then enable Core only for the
agreed acceptance window. Local email and password authentication remains
available unless the separately reviewed SSO-only policy is enabled.

## Acceptance test

Capture a pass or fail for every applicable row without recording credentials,
tokens, cookie values, or IdP secrets.

| Scenario | Expected result |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Email-first login | Every verified domain offers SSO; password appears only when allowed. |
| Direct link | `/sso/{verifiedDomain}` starts the same organization-pinned broker flow. |
| Disabled or unknown connection | SSO is unavailable and the user can return to local login. |
| Invited `USER` | SSO creates or signs in the user and preserves `USER`. |
| Invited `MANAGER` | SSO creates or signs in the user and preserves `MANAGER`. |
| Invited `ADMIN` | SSO creates or signs in the user and preserves `ADMIN`. |
| Uninvited user, JIT off | Login is rejected; no Core user or federated identity is created. |
| Uninvited user, JIT on | One verified, passwordless Core `USER` and one federated identity are created. |
| No seat available | Login is rejected; no Core user or federated identity is created. |
| Invitation while JIT is on | The invitation can still be created and accepted. |
| Core MFA required | The user verifies or enrolls MFA unless the validated broker claim contains `mfa`. |
| Local password user | Existing local login and MFA behavior are unchanged. |
| Existing account, password login allowed | First SSO attempt requires linking. Sign in locally, open Settings → Account → Connect SSO, and authenticate with the same work email. Connected state survives reload and subsequent SSO signs in the same Core user. |
| Existing linked or JIT account | Account settings shows SSO connected without a connect action. |
| Mismatched linking identity | Linking fails without changing the signed-in user's identity or session; the user can retry with the correct work account. |
| Microsoft first-time user | Broker profile has the approved work email marked verified; Core admission follows the chosen JIT or invite policy. |
| Microsoft existing unverified user | After the reviewed correction and a fresh external login, verify the stored email status and complete Core login; a saved provider toggle alone is not acceptance. |
| Logout | The Core session is revoked; SSO sessions continue through broker logout. |

For the first production municipality, record the operator, date, environment,
Core organization ID, Zitadel organization ID, verified domains, IdP type, JIT
setting, seat state, test users' roles, and outcome of each row. Attach only
non-secret screenshots or logs to the reviewed change record.

## Troubleshoot an onboarding failure

Record the exact environment, attempt time with timezone, Core organization
ID, and the final `/sso/error?code=...` URL. Request Microsoft request/correlation
IDs and timestamps when Microsoft displays an error. Do not request or attach
authorization callback URLs containing codes, tokens, cookies, or raw token
payloads. The translated error-page text alone can represent multiple codes.

| Evidence | Next check and owner |
| --- | --- |
| `AADSTS700016` (application not found) | Compare the client and tenant IDs saved in Zitadel with the customer's Entra app **Overview**. Customer IT confirms the app exists in that directory. Check for Secret ID/Object ID confusion before assigning fault. |
| Invalid client secret | Customer IT confirms the secret value belongs to that exact application and is unexpired; exchange securely and update Zitadel. |
| Redirect URI mismatch | Compare the actual requested redirect with the target broker's displayed V1/V2 callback and the customer's registered **Web** redirect. |
| Consent or assignment failure | Customer IT reviews the specific Entra error and sign-in logs, delegated consent, allowed users, and enterprise-app sign-in policy. |
| `SSO_BROKER_RESPONSE_INVALID` | Ayunis checks broker protocol validation and required UserInfo claims. For Microsoft, inspect email and its verified status first. This code alone does not prove an email-verification failure or bad customer secret. |
| `SSO_ORGANIZATION_MISMATCH` | Ayunis checks the pinned Zitadel organization, returned resource owner, and approved email domains. |
| `SSO_LOGIN_TRANSACTION_INVALID` | Start a new login from Core; check expiry and browser binding. A private window helps isolate sessions but cannot fix a wrong app ID or tenant. |

Use [Microsoft's error reference](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
for the exact Entra code. For Core, query the production or staging AppSignal
application explicitly, follow callback traces, and inspect whether session
creation occurred. Browser-binding presence alone does not prove the whole
transaction is valid. Expected callback errors may redirect without a detailed
log or exception incident; absence of an incident is not proof of success.
If evidence is insufficient, reproduce with the customer's IT while collecting
broker-side diagnostics. They enter their own credentials. Do not declare a
fix verified until a fresh login completes in the named environment.

## Rotation and mapping changes

Adding a verified domain does not require disabling SSO or restoring password
login. Add it in the SSO tab, acknowledge verification, and save. Existing
domains and broker identifiers stay unchanged. Save direct-IdP changes
separately. For SSO-only connections, accounts with the added domain in another
Core organization block the update. If the save returns
`SSO_CONNECTION_CHANGED`, reload the connection, review the current mapping and
retry. Do not disable SSO for this additive-domain conflict.

SSO cannot be disabled while any member lacks a local password. Do not bypass
this safeguard for routing changes; plan account recovery before any change
that requires disablement.

1. If the organization requires SSO, first restore local password login. Then
   disable the Core connection before removing domains, changing the Zitadel organization
   mapping, OIDC client secret, SAML metadata, or signing certificate.
2. Rotate credentials through the approved secret channel and update Zitadel.
3. Verify the external IdP at Zitadel, review the Core mapping, and repeat the
   acceptance test before re-enabling.
4. Revoke superseded credentials at the customer IdP only after the new path is
   proven.

Do not delete the Core mapping, Zitadel organization, or identity links during
rotation.

## Incident response and rollback

1. If the organization requires SSO, first restore local password login. Then
   select **Disable SSO** in the organization's SSO tab. This preserves the
   mapping and immediately prevents new SSO starts. This action remains blocked
   if any member lacks a local password; use the provider-specific containment
   below rather than bypassing the safeguard.
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
