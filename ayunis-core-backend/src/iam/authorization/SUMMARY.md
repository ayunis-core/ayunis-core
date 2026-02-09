Access Control
Guards and decorators enforcing role-based access control rules.

Provides authorization infrastructure through NestJS guards and decorators for role-based access control, subscription validation, email confirmation checks, and rate limiting across all API endpoints.

This module supplies the cross-cutting authorization layer for Ayunis. It contains no domain entities of its own but defines guards and decorators consumed by every controller. Key components include `RolesGuard` with `@Roles()` decorator for org-level admin restrictions (checks `UserRole.ADMIN` or `USER`), `SystemRolesGuard` with `@SystemRoles()` for platform-level system role checks, `SubscriptionGuard` with `@RequiresSubscription()` to gate features behind active subscriptions, `EmailConfirmGuard` to restrict unverified users, and `RateLimitGuard` with `@RateLimit()` for request throttling. It depends on **authentication** for the `ActiveUser` entity attached to requests and **users** for role value objects. Authorization errors are defined locally and converted to HTTP 403 responses via `toHttpException()`.
