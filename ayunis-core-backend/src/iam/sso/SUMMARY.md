SSO
Persists organization SSO configuration and links validated broker identities to Ayunis users.

Each organization can have one SSO connection with a unique verified email domain, its verification timestamp, and an optional unique Zitadel organization ID. The enabled flag is the runtime login switch and requires a broker organization mapping. JIT provisioning is an independent opt-in through `jitProvisioningEnabled`; invitations remain available regardless of that setting.

Federated identities use the exact validated OIDC issuer and subject as their durable unique key and reference the internal Ayunis user. Organization and user deletion cascade to their corresponding SSO records. This module does not persist customer IdP credentials or the future self-service onboarding lifecycle, and it does not implement OIDC protocol handling, account linking, provisioning, or authorization decisions.

`OrgSsoConnection` owns normalized connection state, while `OrgSsoConnectionsRepository` defines lookups, persistence, and conditional updates for routing and runtime flags. The Postgres adapter translates uniqueness violations into the application SSO error contract and uses conditional writes to prevent stale operator changes from overwriting newer state.
