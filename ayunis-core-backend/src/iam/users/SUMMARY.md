User Management
Creates, validates, and manages user accounts with role-based access.

Manages the full user lifecycle including account creation (admin and regular), email confirmation, password management (reset, update, validation), profile updates, role assignment, and user lookup by ID, email, or organization.

This module is the central identity store for Ayunis. The core entity is `User` with email, password hash, `UserRole` (admin/user for org-level access), `SystemRole` (customer/super-admin for platform-level access), org association, email verification status, and marketing consent. Key use cases span account creation (`CreateUserUseCase`, `CreateAdminUserUseCase`, `CreateRegularUserUseCase`), authentication support (`ValidateUserUseCase`, `IsValidPasswordUseCase`), email workflows (`ConfirmEmailUseCase`, `SendConfirmationEmailUseCase`, `ResendEmailConfirmationUseCase`), password management (`TriggerPasswordResetUseCase`, `AdminTriggerPasswordResetUseCase`, `SuperAdminTriggerPasswordResetUseCase`, `SendPasswordResetEmailUseCase`, `ResetPasswordUseCase`, `UpdatePasswordUseCase`, `ValidatePasswordResetTokenUseCase`), profile updates (`UpdateUserNameUseCase`, `UpdateUserRoleUseCase`), queries (`FindUserByIdUseCase`, `FindUserByEmailUseCase`, `FindUsersByOrgIdUseCase`), and `DeleteUserUseCase`. JWT services handle email confirmation and password reset tokens.

### Domain Events

- **UserCreatedEvent** (`user.created`) — Emitted when a user is created. Carries userId, orgId, optional User entity, and optional department.
- **UserUpdatedEvent** (`user.updated`) — Emitted when a user profile is updated. Carries userId, orgId, and the User entity.
- **UserDeletedEvent** (`user.deleted`) — Emitted when a user is deleted. Carries userId and orgId.

It integrates with **authentication** (credential validation), **hashing** (password storage), **orgs** (org membership), **invites** (user creation on invite acceptance), and **authorization** (role definitions).
