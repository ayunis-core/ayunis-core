SSO
Persists organization SSO configuration and links validated broker identities to Ayunis users.

Each organization can have one SSO connection with a canonical email domain and an optional unique Zitadel organization ID. Draft domains do not reserve ownership; the separately stored verified domain becomes unique only after verification. Connection status tracks onboarding from draft through activation, while the independent enabled flag acts as the runtime login switch. Enabling a connection requires an active status, an exact match between the candidate and verified domains, and a broker organization mapping. Provisioning defaults to invite-only; JIT must be explicitly selected.

Federated identities use the exact validated OIDC issuer and subject as their durable unique key and reference the internal Ayunis user. Organization and user deletion cascade to their corresponding SSO records. This module does not implement OIDC protocol handling, onboarding, account linking, provisioning, or authorization decisions.
