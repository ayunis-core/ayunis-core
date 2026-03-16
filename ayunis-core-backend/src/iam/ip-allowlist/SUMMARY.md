IP Allowlist
Manages per-organization IP allow lists that restrict API access to approved CIDR ranges.

Provides CRUD operations for IP allowlists scoped to organizations. The domain layer validates CIDR notation (IPv4 and IPv6) and the `IpAllowlist` entity enforces that all CIDRs are well-formed at construction time. The `cidr.util` module offers `isValidCidr` for format validation and `isIpInCidrs` for runtime IP-in-range checks using Node's `BlockList`.

Use cases: **update-ip-allowlist** (upsert with admin lockout protection — ensures the caller's IP is in the new list), **get-ip-allowlist** (read current allowlist for an org), **delete-ip-allowlist** (remove the allowlist, disabling IP restrictions). Errors: `InvalidCidrError` (domain, malformed CIDR input), `IpNotAllowedError` (application, access denied), `AdminLockoutError` (application, self-lockout prevention).

Guard: **IpAllowlistGuard** is a NestJS guard that enforces IP restrictions on authenticated requests. It maintains an in-memory cache (60s TTL) of allowlists per organization and skips public routes. The guard is exported from the module and intended for use as a global `APP_GUARD`.

Ports: **IpAllowlistCachePort** is an abstract class defining a `invalidateCache(orgId)` method. The guard implements this port, and it is provided via `useExisting` so that use cases can invalidate the cache without depending on the guard directly. Both `UpdateIpAllowlistUseCase` and `DeleteIpAllowlistUseCase` inject this port to invalidate the cache after mutations.
