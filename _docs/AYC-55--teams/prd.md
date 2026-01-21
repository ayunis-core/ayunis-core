# AYC-55: Teams Feature

## Problem Statement

Currently, Ayunis supports sharing agents at two levels: **private** (owner only) or **organization-wide** (everyone in the org). This all-or-nothing approach doesn't support common organizational structures where work is organized into departments, project groups, or functional teams.

**Why this matters:**
- Organizations often have distinct groups (e.g., HR, Legal, Engineering) that need to share agents internally but not across the entire organization
- Sharing an agent org-wide exposes it to users who don't need it, cluttering their agent list
- There's no way to organize users into logical groups for collaboration

**What we're solving:**
- Enable org admins to create teams and assign users to them
- Allow agent owners to share agents with specific teams instead of the entire organization
- Provide a middle ground between private and org-wide sharing

---

## Personas

### Organization Admin
A user with the `ADMIN` role in an organization. Responsible for managing teams and team membership.

### Regular User  
A standard user who belongs to one or more teams. Can share their own agents with teams they belong to.

---

## User Scenarios and User Flows

### Scenario 1: Admin Creates and Manages Teams

**Actor:** Organization Admin

**Goal:** Create teams to organize users into logical groups

#### User Flow

1. Admin navigates to **Admin Settings**
2. Admin selects **Teams** section (new)
3. Admin sees list of existing teams (or empty state)
4. Admin clicks **Create Team**
5. Admin enters team name
6. Admin saves the team
7. System creates the team and shows it in the list

**Alternative Flows:**
- Admin can edit team name after creation
- Admin can delete a team (see Scenario 4 for implications)

**Note:** Team membership is NOT managed on this page. Users are assigned to teams via the Users table (see Scenario 2).

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1.1 | System shall allow org admins to create teams with a unique name within the organization |
| FR-1.2 | System shall allow org admins to edit team names |
| FR-1.3 | System shall allow org admins to delete teams |
| FR-1.4 | System shall display a list of all teams in the organization to admins |
| FR-1.5 | Teams page shall NOT include user/member management functionality |

#### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1.1 | Team names must be unique within an organization |

#### Acceptance Criteria

- [ ] Admin can create a team with a name
- [ ] Admin cannot create a team with a duplicate name (within the org)
- [ ] Admin can see all teams in the organization
- [ ] Admin can edit a team's name
- [ ] Admin can delete a team
- [ ] Non-admin users cannot access team management
- [ ] Teams page does NOT show team members or allow adding/removing members

#### Dependencies
- Existing admin settings UI structure
- Existing organization/user infrastructure

#### Assumptions
- An organization can have an unlimited number of teams (no arbitrary limit for MVP)

---

### Scenario 2: Admin Manages Team Membership via Users Table

**Actor:** Organization Admin

**Goal:** Assign users to teams via the Users management table

#### User Flow

1. Admin navigates to **Admin Settings > Users**
2. Admin sees the existing users table with a new **Team** column
3. Each user row displays their current team (or "No team") and a dropdown control
4. Admin clicks the team dropdown for a specific user
5. Dropdown shows all available teams plus a "No team" option
6. Admin selects a team (or "No team" to remove assignment)
7. System immediately updates the user's team assignment

**Alternative Flows:**
- User has no team → Team column shows "No team" or empty state
- No teams exist in the org → Dropdown shows empty state with hint to create teams first

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-2.1 | System shall display a Team column in the Users table showing each user's team assignment |
| FR-2.2 | System shall provide a single-select dropdown on each user row to assign their team |
| FR-2.3 | System shall allow org admins to assign a user to exactly one team |
| FR-2.4 | System shall allow org admins to remove a user's team assignment (set to "No team") |
| FR-2.5 | System shall enforce that a user belongs to at most one team |

#### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-2.1 | No limit on team members for MVP |
| NFR-2.2 | Team membership changes should be reflected immediately in the UI |

#### Acceptance Criteria

- [ ] Users table shows a Team column for each user
- [ ] Admin can see which team a user belongs to at a glance
- [ ] Admin can open a dropdown to change a user's team assignment
- [ ] Dropdown shows all org teams plus "No team" option
- [ ] Admin can assign a user to one team
- [ ] Admin can remove a user from their team (select "No team")
- [ ] A user can only belong to zero or one team (not multiple)
- [ ] Changes persist immediately

#### Dependencies
- Team entity from Scenario 1
- Existing Users table/page in Admin Settings

#### Assumptions
- The existing Users table can be extended with a new column
- Single-select dropdown pattern is consistent with existing UI patterns

---

### Scenario 3: User Shares Agent with Team

**Actor:** Regular User (agent owner)

**Goal:** Share an owned agent with a specific team instead of the entire organization

#### User Flow

1. User navigates to their agent's settings/sharing options
2. User sees current sharing state: **Private** (default)
3. User clicks to change sharing
4. User sees sharing options:
   - Private (only me)
   - Team: [dropdown of teams user belongs to]
   - Organization (everyone)
5. User selects **Team** and chooses a team from the dropdown
6. System updates sharing to the selected team
7. Team members can now see and use the agent

**Alternative Flows:**
- User belongs to no teams → Team option is disabled or hidden
- User changes from Team share to Org share → Team selection is cleared, agent becomes org-shared
- User changes from Org share to Team share → User selects team, agent becomes team-shared only
- User changes from any share to Private → Share is removed entirely

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-3.1 | System shall allow agent owners to share an agent with a single team they belong to |
| FR-3.2 | System shall display only teams the user belongs to in the sharing dropdown |
| FR-3.3 | System shall enforce mutually exclusive sharing states: Private, Team, or Organization |
| FR-3.4 | When switching from Team to Org share, system shall remove the team association |
| FR-3.5 | When switching from Org to Team share, system shall require team selection |
| FR-3.6 | When switching to Private, system shall remove all sharing |

#### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-3.1 | Users should only see teams they are members of (not all org teams) |

#### Acceptance Criteria

- [ ] User can share an agent with a team they belong to
- [ ] User can only see teams they are a member of in the dropdown
- [ ] User can only share with ONE team at a time (MVP)
- [ ] Sharing is mutually exclusive: Private OR Team OR Organization
- [ ] Switching sharing modes clears the previous sharing configuration
- [ ] Team members can see and use agents shared with their team
- [ ] Non-team-members cannot see team-shared agents

#### Dependencies
- Team membership management from Scenario 2 (Users table)
- Existing sharing infrastructure (`Share`, `ShareScope` entities)

#### Assumptions
- Multi-team sharing (sharing with Team A AND Team B) is out of scope for MVP

---

### Scenario 4: Team Deletion Impact on Shared Agents

**Actor:** Organization Admin

**Goal:** Delete a team while gracefully handling shared content

#### User Flow

1. Admin navigates to **Admin Settings > Teams**
2. Admin clicks delete button on a team row (or in team edit dialog)
3. System shows confirmation dialog explaining impact:
   - "Deleting this team will make X agents private. Users with active threads using these agents will be switched to the default model."
4. Admin confirms deletion
5. System:
   - Makes all agents shared with this team **private**
   - Updates affected threads to use the org's default model (existing behavior)
   - Clears team assignment for all users in the team (sets to "No team")
   - Deletes the team

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-4.1 | When a team is deleted, all agents shared with that team shall become private |
| FR-4.2 | When a team is deleted, threads using team-shared agents (for non-owners) shall fall back to the org's default model |
| FR-4.3 | System shall show a confirmation dialog before team deletion |
| FR-4.4 | The confirmation shall indicate the number of affected agents |

#### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-4.1 | Team deletion should be transactional (all-or-nothing) |

#### Acceptance Criteria

- [ ] Deleting a team shows a confirmation dialog
- [ ] Confirmation dialog shows the count of affected agents
- [ ] After deletion, previously team-shared agents become private
- [ ] After deletion, threads of non-owners using team-shared agents switch to default model
- [ ] Agent owners' threads are unaffected
- [ ] Users in the deleted team have their team assignment cleared (set to "No team")

#### Dependencies
- Existing `ReplaceAgentWithDefaultModelUseCase` for thread fallback behavior
- Existing share deletion logic

#### Assumptions
- The fallback behavior matches existing org-share revocation behavior exactly

---

### Scenario 5: User Removed from Team

**Actor:** Organization Admin (performs action), Regular User (affected)

**Goal:** Remove a user from a team while handling their access to team-shared agents

#### User Flow

1. Admin navigates to **Admin Settings > Users**
2. Admin opens the team dropdown for a specific user
3. Admin selects "No team" to remove the user from their current team
4. System:
   - Removes the user's team assignment
   - User loses access to agents shared with that team
   - User's threads using those agents fall back to the org's default model

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-5.1 | When a user is removed from a team, they shall lose access to agents shared with that team |
| FR-5.2 | When a user loses access to a team-shared agent, their threads using that agent shall fall back to the org's default model |

#### Acceptance Criteria

- [ ] Removed user can no longer see team-shared agents
- [ ] Removed user's existing threads with team-shared agents switch to default model
- [ ] Agent owner's threads remain unaffected (they still own the agent)

#### Dependencies
- Thread fallback mechanism from existing implementation
- Team membership management from Scenario 2

#### Assumptions
- Behavior is consistent with existing org-share revocation

---

## Out of Scope

The following are explicitly **NOT** part of this MVP:

| Item | Rationale |
|------|-----------|
| Multi-team membership (user in multiple teams) | Simplifies model; users belong to 0 or 1 team |
| Multi-team sharing (agent shared with multiple teams) | Adds complexity; can be added later if needed |
| Team hierarchy (nested teams) | Over-engineering for MVP |
| Team leads / team admin role | Only org admins manage teams for now |
| User self-service (join/leave teams) | Simplifies authorization; admin-controlled only |
| Sharing other entities with teams (Prompts, Sources, etc.) | Start with Agents only, expand based on feedback |
| Team-specific permissions (read vs. edit) | Current model is "use + view config" only |
| Team visibility settings | Users only see their own teams; simple and private |
| Bulk team operations | Can import/export team membership later |

---

## Data Model Summary

### New Entities

**Team**
- `id`: UUID
- `name`: string (unique within org)
- `orgId`: UUID (FK to Organization)
- `createdAt`: Date
- `updatedAt`: Date

### Extended Entities

**User**
- Add `teamId`: UUID (FK to Team, nullable) — user belongs to zero or one team

**ShareScopeType** (enum)
- Add `TEAM` value

**TeamShareScope** (new, extends ShareScope)
- `teamId`: UUID (FK to Team)

---

## Technical Notes

The existing sharing infrastructure is well-designed for extension:
- `Share` → `AgentShare` pattern supports new entity types
- `ShareScope` → `OrgShareScope` pattern supports new scope types (`TeamShareScope`)
- `ShareScopeType` enum just needs `TEAM` added

Thread fallback behavior already exists in `ReplaceAgentWithDefaultModelUseCase` and should be reused.

---

## Open Questions

None remaining - all requirements have been clarified.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-05 | Claude | Initial PRD based on requirements clarification session |
| 2026-01-21 | Claude | Moved team membership management from Teams page to Users table (per user dropdown); simplified to single-team membership (user belongs to 0 or 1 team) |
