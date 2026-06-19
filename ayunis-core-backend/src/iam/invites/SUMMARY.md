User Invitations
Manages organization member invitations with email and token workflow.

Handles the full invitation lifecycle for onboarding users into organizations. Supports creating single and bulk invites, sending invitation emails with JWT tokens, accepting invites, resending expired invites, and deletion.

This module manages how new users join existing organizations in Ayunis. The core entity is `Invite`, containing email, target org, assigned role (admin/user), inviter reference, expiration date, acceptance timestamp, and a `prepared` flag. Key use cases include `CreateInviteUseCase` and `CreateBulkInvitesUseCase` for issuing invitations, `SendInvitationEmailUseCase` for dispatching email with a signed JWT link, `AcceptInviteUseCase` for processing token-based acceptance and creating the user account, `ResendExpiredInviteUseCase` for refreshing expired invitations, `GetInvitesByOrgUseCase` for listing pending invites, and `GetInviteByTokenUseCase` for token validation. It integrates with **users** for account creation upon acceptance, **orgs** for organization membership, and **authentication** for the invite JWT service. The `InvitesRepositoryPort` abstracts persistence with a local PostgreSQL implementation using TypeORM.

### Prepared invites

User creation can be decoupled from invitation emails. Creating an invite with `prepared: true` stores it without sending the email (status `prepared`), so admins can set up the full user list and team structure ahead of a launch. On cloud deployments, seats for prepared invites are allocated when they are sent, not when they are created. `SendPreparedInvitesUseCase` dispatches every prepared invite of an organization at once, refreshing each invite's expiry so the accept link is valid from the moment it is delivered. By default invites are still sent immediately on creation.
