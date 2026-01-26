# AYC-51: Ayunis Marketplace

## Problem Statement

Ayunis Core users currently have limited options for discovering and using pre-built agents and integrations. Each organization must build their own agents from scratch and manually configure MCP integrations. There is no way to share or discover useful configurations across organizations.

A marketplace enables:

- **Discovery**: Users can browse curated agents and integrations
- **Quick onboarding**: New users can get productive faster with pre-built solutions
- **Best practices**: Curated content showcases recommended configurations
- **Future community**: Foundation for community-contributed content

## User Personas

### Regular User

- Wants to enhance their AI assistant capabilities
- Browses and installs agents for personal use
- Has limited technical knowledge about integrations

### Organization Admin

- Responsible for enabling capabilities across the organization
- Installs MCP integrations that all org users can leverage
- Manages what tools are available to users in their org

### Ayunis Team (Content Curator)

- Creates and curates marketplace content
- Reviews and approves community submissions (future)
- Manages categories and featured content

---

## User Scenarios and User Flows

---

### Scenario 1: User Browses the Marketplace

**Persona**: Regular User

**Goal**: Discover available agents and integrations

**Flow**:

1. User navigates to marketplace (marketplace.ayunis.com or via link in Ayunis Core)
2. User sees the marketplace homepage with featured content
3. User can switch between "Agents" and "Integrations" tabs/sections
4. User uses search to find specific items by name or description
5. User filters by category (e.g., "Productivity", "Development", "Data")
6. User views a list of matching items with name, description, and category
7. User clicks an item to view full details

#### Functional Requirements

| ID     | Requirement                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------- |
| FR-1.1 | System shall display a marketplace homepage accessible at marketplace.ayunis.com                      |
| FR-1.2 | System shall separate content into "Agents" and "Integrations" sections                               |
| FR-1.3 | System shall provide text search across item names and descriptions                                   |
| FR-1.4 | System shall allow filtering by predefined categories                                                 |
| FR-1.5 | System shall display item cards with: name, short description, category, and type (agent/integration) |
| FR-1.6 | System shall provide a detail view for each item showing full description and metadata                |

#### Non-Functional Requirements

| ID      | Requirement                                                     |
| ------- | --------------------------------------------------------------- |
| NFR-1.1 | Marketplace shall be publicly accessible without authentication |
| NFR-1.2 | Search results shall return within 500ms                        |
| NFR-1.3 | Marketplace shall be accessible from any Ayunis Core instance   |

#### Acceptance Criteria

- [ ] User can access marketplace.ayunis.com without logging in
- [ ] User can view separate lists of agents and integrations
- [ ] User can search by text and see relevant results
- [ ] User can filter by category
- [ ] User can view detailed information about any item

#### Dependencies

- Marketplace service infrastructure (hosting, domain)
- Content creation (initial curated agents and integrations)

#### Assumptions

- Categories are predefined by Ayunis team (not user-created)
- All marketplace content is public (no private/org-specific content in v1)

---

### Scenario 2: User Installs an Agent

**Persona**: Regular User

**Goal**: Add a marketplace agent to their personal account

**Flow**:

1. Marketplace: User browses marketplace and finds an agent they want
2. Marketplace: User clicks "Install" button on the agent detail page
3. Ayunis Core: System checks if user is authenticated in Ayunis Core
   - If not: redirects to login, then returns to installation flow
4. Ayunis Core: System checks if the agent's specified model is permitted in user's org
   - If not permitted: shows model selection dialog with available alternatives
   - User selects an alternative model
5. Ayunis Core: System checks if the agent requires MCP integrations
   - If required integrations are not installed in user's org: shows warning with list of required integrations and prompts user to contact their admin
   - User can choose to proceed without those tools or cancel
6. Ayunis Core: System creates a copy of the agent in user's account

#### Functional Requirements

| ID      | Requirement                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------- |
| FR-2.1  | System shall provide an "Install" action for each agent                                               |
| FR-2.2  | System shall require authentication to install (redirect to Ayunis Core login if needed)              |
| FR-2.3  | System shall check model compatibility against user's org permitted models                            |
| FR-2.4  | System shall display model selection dialog when original model is not permitted                      |
| FR-2.5  | System shall check for required MCP integration dependencies                                          |
| FR-2.6  | System shall warn user when required integrations are missing and identify them                       |
| FR-2.7  | System shall allow user to proceed without missing tools or cancel installation                       |
| FR-2.8  | System shall create a full copy of the agent (name, instructions, tool assignments) in user's account |
| FR-2.9  | Installed agent shall be fully editable by the user                                                   |
| FR-2.10 | System shall provide confirmation and navigation to the installed agent                               |

#### Non-Functional Requirements

| ID      | Requirement                                                     |
| ------- | --------------------------------------------------------------- |
| NFR-2.1 | Installation shall complete within 3 seconds                    |
| NFR-2.2 | Agent copy shall be independent of marketplace source (no sync) |

#### Acceptance Criteria

- [ ] Unauthenticated user clicking "Install" is redirected to login, then back to install flow
- [ ] When agent's model is not permitted, user sees alternative model selection
- [ ] When agent requires uninstalled MCP integrations, user sees warning listing them
- [ ] User can choose to install without missing tools
- [ ] Installed agent appears in user's agent list in Ayunis Core
- [ ] User can edit all properties of the installed agent

#### Dependencies

- Ayunis Core authentication system
- Ayunis Core agent creation API
- Ayunis Core model permissions API
- Ayunis Core MCP integration status API

#### Assumptions

- User must have an Ayunis Core account to install
- Installed agents are not automatically updated when marketplace version changes
- Tool assignments reference MCP integration tools by identifier

---

### Scenario 3: Admin Installs an MCP Integration

**Persona**: Organization Admin

**Goal**: Enable an MCP integration for their entire organization

**Flow**:

1. Marketplace: Admin browses marketplace and finds an MCP integration they want
2. Marketplace: Admin clicks "Install" button on the integration detail page
3. Ayunis Core: System checks if user is authenticated and has admin role
   - If not authenticated: redirects to login
   - If not admin: shows "Admin required" message
4. Ayunis Core: System displays integration details and confirms installation
5. Ayunis Core: Admin confirms installation
6. Ayunis Core: System enables the MCP integration for the organization
7. Ayunis Core: Admin is shown success message
8. Ayunis Core: Integration tools are now available to all users in the org when configuring agents

#### Functional Requirements

| ID     | Requirement                                                                            |
| ------ | -------------------------------------------------------------------------------------- |
| FR-3.1 | System shall provide an "Install" action for each MCP integration                      |
| FR-3.2 | System shall require admin role to install integrations                                |
| FR-3.3 | System shall show appropriate error when non-admin attempts installation               |
| FR-3.4 | System shall display integration details before confirming installation                |
| FR-3.5 | System shall enable the MCP integration for the entire organization upon installation  |
| FR-3.6 | System shall make integration tools available to all org users for agent configuration |
| FR-3.7 | System shall provide confirmation of successful installation                           |

#### Non-Functional Requirements

| ID      | Requirement                                                                |
| ------- | -------------------------------------------------------------------------- |
| NFR-3.1 | Installation shall complete within 5 seconds                               |
| NFR-3.2 | Integration shall be available to org users immediately after installation |

#### Acceptance Criteria

- [ ] Only users with admin role can successfully install integrations
- [ ] Non-admin users see clear "Admin required" message
- [ ] Admin sees integration details before confirming
- [ ] After installation, integration appears in org's enabled integrations
- [ ] All org users can assign tools from the installed integration to their agents

#### Dependencies

- Ayunis Core admin authorization
- Ayunis Core MCP integration enablement API

#### Assumptions

- V1 does not require additional configuration input for integrations (future enhancement)
- Installing an integration does not automatically add its tools to existing agents

---

### Scenario 4: User Views Installed Items (in Marketplace, not in Ayunis Core!)

**Persona**: Regular User / Organization Admin

**Goal**: See what has been installed from the marketplace

**Flow**:

1. User navigates to marketplace while authenticated
2. System indicates which agents the user has installed from the market place
3. For admins: system indicates which integrations are installed for their org (all are installed via the market place so no visual distinction)

#### Functional Requirements

| ID     | Requirement                                                                      |
| ------ | -------------------------------------------------------------------------------- |
| FR-4.1 | System shall track which marketplace items have been installed per user (agents) |
| FR-4.2 | System shall track which marketplace integrations are installed per organization |
| FR-4.3 | System shall display "Installed" indicator on installed items                    |

#### Non-Functional Requirements

| ID      | Requirement                                         |
| ------- | --------------------------------------------------- |
| NFR-4.1 | Installation status shall be retrieved within 500ms |

#### Acceptance Criteria

- [ ] Authenticated user sees "Installed" badge on agents they've installed
- [ ] Authenticated user sees "Installed" badge on integrations their org has enabled
- [ ] Unauthenticated users see all items as installable (no status)

#### Dependencies

- Tracking mechanism for installed items (marketplace or Core side)

#### Assumptions

- Uninstalling/deleting an agent in Core does not update marketplace status (v1 simplification)

---

## Out of Scope (V1)

| Item                                                   | Rationale                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| Publishing content to marketplace                      | Future phase - requires review workflow, publisher management |
| Community contributions                                | Requires publishing first                                     |
| Ratings and reviews                                    | Nice-to-have, not essential for v1                            |
| Version management and updates                         | Complexity; v1 copies are independent snapshots               |
| Integration configuration during install               | Future enhancement - v1 integrations work out-of-box          |
| Private/org-specific marketplace content               | V1 is public curated content only                             |
| Automatic sync between marketplace and installed items | V1 creates independent copies                                 |
| Uninstall tracking                                     | Deleting in Core doesn't affect marketplace status            |
| Featured/popular sections                              | Nice-to-have; search + categories sufficient for v1           |

---

## Technical Considerations

### Marketplace as Separate Service

The marketplace will be a separate application/service:

- Hosted at marketplace.ayunis.com
- Multiple Ayunis Core instances connect to it
- Public read API (no authentication required for browsing)
- Installation actions redirect to / communicate with user's Ayunis Core instance

### API Contract

Marketplace exposes REST API for:

- Getting agent details (including model reference, tool dependencies)
- Getting integration details (including MCP server configuration)

Ayunis Core provides URLs for:

- Creating agent from marketplace definition (e.g. `/install/agent/<AGENT_TOKEN>`)
- Enabling MCP integration from marketplace definition (`/install/mcp/<MCP_TOKEN>`)

### Data Model Considerations

**Marketplace Agent:**

- ID, name, description, category
- Instructions (system prompt)
- Model reference (identifier, not org-specific)
- Tool dependencies (list of MCP integration identifiers + tool names)
- Metadata (author: "Ayunis", created date, etc.)

**Marketplace Integration:**

- ID, name, description, category
- MCP server URL
- Available tools (schema)
- Authentication requirements (future: for configuration)
- Metadata (author: "Ayunis", created date, etc.)

---

## Resolved Questions

1. **Model references**: Models are referenced by provider + model name (e.g., `anthropic/claude-3-sonnet`, `openai/gpt-4o`). This allows portable matching across organizations.

2. **Categories**: Defined by Ayunis team, organized by use case (e.g., Productivity, Development, Data Analysis, Communication, Research). Taxonomy can evolve independently of the codebase.

3. **Initial content**: Dummy/placeholder content for initial development. Real curated content will be added by Ayunis team before launch.
