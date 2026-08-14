# Municipal SSO V1 onboarding

Use this runbook after the municipality has supplied its IdP configuration through the approved secure channel. IdP credentials and metadata are configured in Zitadel and are never passed to or stored by Ayunis Core.

## Prerequisites

- Confirm the requester is authorized to configure SSO for the municipality.
- Verify control of the email domain and complete a test login through the customer IdP.
- Create the municipality's Zitadel organization and configure its external IdP.
- Record the Ayunis organization UUID, verified email domain, and Zitadel organization ID.
- Verify the shared Ayunis Core OIDC application in Zitadel has the Core callback URL, `FRONTEND_BASEURL` as its post-logout redirect URI, and the public `/api/auth/sso/oidc/backchannel-logout` endpoint as its back-channel logout URI.
- Keep the Core and Zitadel clocks synchronized; callback validation enforces the configured `SSO_REAUTH_MAX_AGE_SECONDS` (24 hours by default) against the signed `auth_time` claim.

## Configure Core

1. Sign in to Ayunis Core as a `SUPER_ADMIN`.
2. Open **Superadmin → Organizations → municipality → SSO**.
3. Enter the verified email domain and Zitadel organization ID.
4. Confirm that domain ownership and the Zitadel setup were verified.
5. Save the connection, then choose whether JIT provisioning should create users on first SSO login.

New connections remain disabled. Review the saved domain and Zitadel organization mapping, then select **Enable SSO** and confirm that exact mapping.

Invited users can use SSO regardless of the JIT setting. JIT can be changed independently from the same tab.

SSO session families expire absolutely after the configured reauthentication window and do not extend through refresh-token rotation. Password sessions keep their existing refresh behavior. Back-channel logout revokes matching SSO sessions earlier when Zitadel sends it.

To change the verified domain or Zitadel organization mapping, disable SSO first, save the corrected mapping, complete another broker test login, and review the mapping again before enabling it.

## Rollback

Select **Disable SSO** in the organization's SSO tab. This preserves the mapping and does not affect local email and password login.
