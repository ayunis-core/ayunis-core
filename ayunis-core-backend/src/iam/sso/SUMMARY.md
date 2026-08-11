SSO
Persists organization SSO configuration and links validated broker identities to Ayunis users.

Each organization can have one SSO connection with a unique verified email domain, its verification timestamp, and an optional unique Zitadel organization ID. The enabled flag is the runtime login switch and requires a broker organization mapping. JIT provisioning is an independent opt-in through `jitProvisioningEnabled`; invitations remain available regardless of that setting.

Federated identities use the exact validated OIDC issuer and subject as their durable unique key and reference the internal Ayunis user. Organization and user deletion cascade to their corresponding SSO records. This module does not persist customer IdP credentials or the future self-service onboarding lifecycle, and it does not implement OIDC protocol handling, account linking, provisioning, or authorization decisions.

`OrgSsoConnection` owns normalized connection state, while `OrgSsoConnectionsRepository` defines lookups, persistence, and conditional updates for routing and runtime flags. The Postgres adapter reports database constraint violations without deciding application conflicts and uses conditional writes to prevent stale operator changes from overwriting newer state.

For V1, reusable application use cases read and configure a verified domain and its Zitadel organization mapping. New mappings are disabled by default, repeated configuration is idempotent, and an enabled mapping must be disabled before its routing identifiers can change. Separate use cases control runtime enablement and JIT provisioning so Superadmin HTTP adapters and later automation can reuse the same boundary.
