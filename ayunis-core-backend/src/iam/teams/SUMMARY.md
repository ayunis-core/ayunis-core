Team Management
Organizes users into teams within organizations for collaboration.

Manages team creation, membership, and listing within organizations. Teams group users for collaborative access control and resource sharing, with support for adding and removing members.

This module provides sub-organization grouping of users in Ayunis. Key entities are `Team` (name, org ID, timestamps) and `TeamMember` (linking a user to a team with an optional hydrated `User` reference). Use cases include `CreateTeamUseCase` (provisions a named team within an org), `UpdateTeamUseCase` (rename), `DeleteTeamUseCase`, `GetTeamUseCase`, `ListTeamsUseCase` (all teams in an org), `ListMyTeamsUseCase` (teams for the current user), `AddTeamMemberUseCase`, `RemoveTeamMemberUseCase`, `ListTeamMembersUseCase`, and `CheckUserTeamMembershipUseCase` (verifies if a user belongs to a specific team). It integrates with **orgs** for organizational scoping, **users** for member identity and hydration, and the **domain** layer where team membership can influence resource visibility. Two repository ports—`TeamsRepositoryPort` and `TeamMembersRepositoryPort`—abstract persistence with PostgreSQL implementations.
