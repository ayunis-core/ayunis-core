IP Allowlist
Manages per-organization IP allow lists that restrict API access to approved CIDR ranges.

Provides CRUD operations for IP allowlists scoped to organizations. The domain layer validates CIDR notation (IPv4 and IPv6) and the `IpAllowlist` entity enforces that all CIDRs are well-formed at construction time. The `cidr.util` module offers `isValidCidr` for format validation and `isIpInCidrs` for runtime IP-in-range checks using Node's `BlockList`.

Use cases: **update-ip-allowlist** (upsert with admin lockout protection — ensures the caller's IP is in the new list), **get-ip-allowlist** (read current allowlist for an org), **delete-ip-allowlist** (remove the allowlist, disabling IP restrictions). Errors: `InvalidCidrError` (domain, malformed CIDR input), `IpNotAllowedError` (application, access denied), `AdminLockoutError` (application, self-lockout prevention), `UnexpectedIpAllowlistError` (application, unexpected operation failure).

`IpAllowlistGuard` enforces the allowlist on every non-public request that carries an authenticated principal. When it rejects a request (client IP outside the allowed CIDRs, or IP undeterminable), it emits a structured `Logger.warn` audit entry via `buildAccessDeniedAuditContext` (`common/util`) capturing the principal and request method/path/IP before throwing `IpNotAllowedError`, so IP-based 403s are auditable rather than silent.
