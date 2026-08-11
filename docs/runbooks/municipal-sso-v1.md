# Municipal SSO V1 onboarding

Use this runbook after the municipality has supplied its IdP configuration through the approved secure channel. IdP credentials and metadata are configured in Zitadel and are never passed to or stored by the Core CLI.

## Prerequisites

- Confirm the requester is authorized to configure SSO for the municipality.
- Verify control of the email domain and complete a test login through the customer IdP.
- Create the municipality's Zitadel organization and configure its external IdP.
- Record the Ayunis organization UUID, verified email domain, and Zitadel organization ID.

## Configure Core

Run commands from `ayunis-core-backend`. Team members using Infisical should prefix local commands with `infisical run --env=dev --path=/backend --`.

Create or update the mapping. This command is safe to repeat. New mappings start disabled; an existing mapping retains its current runtime state:

```bash
pnpm run cli:ts sso:configure \
  --org-id <ayunis-org-uuid> \
  --email-domain <verified-email-domain> \
  --zitadel-org-id <zitadel-org-id> \
  --jit-provisioning-enabled <true|false>
```

Check the command output against the verified email domain and Zitadel organization before enabling SSO. The output contains identifiers and state, never IdP credentials.

Invited users can use SSO regardless of the JIT setting. Set JIT independently when the admission policy changes:

```bash
pnpm run cli:ts sso:set-jit \
  --org-id <ayunis-org-uuid> \
  --enabled <true|false>
```

Enable SSO only after the Zitadel test login and Core mapping have been checked:

```bash
pnpm run cli:ts sso:enable --org-id <ayunis-org-uuid>
```

In a deployed Core container, use the compiled entrypoint instead:

```bash
docker compose exec app node dist/src/cli/main.js sso:enable \
  --org-id <ayunis-org-uuid>
```

## Rollback

Disable the Core runtime switch. This preserves the mapping and does not affect local email and password login:

```bash
pnpm run cli:ts sso:disable --org-id <ayunis-org-uuid>
```

If the email domain or Zitadel organization mapping must change, disable SSO first, rerun `sso:configure`, test the corrected broker setup, and then enable SSO again.
