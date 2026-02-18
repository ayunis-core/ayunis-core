User Invitations
Manages organization member invitations with email and token workflow.

Handles the full invitation lifecycle for onboarding users into organizations. Supports creating single and bulk invites, sending invitation emails with JWT tokens, accepting invites, resending expired invites, and deletion.

This module manages how new users join existing organizations in Ayunis. The core entity is `Invite`, containing email, target org, assigned role (admin/user), inviter reference, expiration date, and acceptance timestamp.

### Domain

- **InviteStatus** (`domain/invite-status.enum.ts`) — Enum defining invitation states: `PENDING`, `ACCEPTED`, `EXPIRED`

### Use Cases

Key use cases include `CreateInviteUseCase` and `CreateBulkInvitesUseCase` for issuing invitations, `SendInvitationEmailUseCase` for dispatching email with a signed JWT link, `AcceptInviteUseCase` for processing token-based acceptance and creating the user account, `ResendExpiredInviteUseCase` for refreshing expired invitations, `GetInvitesByOrgUseCase` for listing pending invites, and `GetInviteByTokenUseCase` for token validation.

### Integration

It integrates with **users** for account creation upon acceptance, **orgs** for organization membership, and **authentication** for the invite JWT service. The `InvitesRepositoryPort` abstracts persistence with a local PostgreSQL implementation using TypeORM.
