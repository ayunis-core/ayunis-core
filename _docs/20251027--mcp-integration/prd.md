# Product Requirements Document: MCP Integration

## 1. Problem Statement

Ayunis currently has a native tool system that allows agents to execute predefined functions. However, this requires hardcoding new tools into the codebase, limiting extensibility. The Model Context Protocol (MCP) is an emerging standard for enabling AI agents to interact with external systems through a standardized interface.

**Problem**: Users cannot easily extend agent capabilities with custom functionality without code changes.

**Opportunity**: By implementing MCP integration, Ayunis can enable organizations to:

- Connect agents to external systems and data sources through standardized MCP servers
- Leverage the growing ecosystem of MCP-compatible tools and services
- Extend agent capabilities without requiring code deployments

**Success Metrics**:

- Organizations can successfully configure and use custom MCP integrations
- Agents can execute MCP tools and access MCP resources during conversations
- CSV resources from MCP servers are automatically processed through the RAG pipeline

## 2. User Personas & Scenarios

### Persona 1: Organization Administrator (Org Admin)

**Role**: Responsible for configuring integrations and managing organization-wide settings

**Scenario 1: Setting up a custom MCP integration**

1. Admin navigates to organization settings
2. Admin adds a new custom MCP integration by providing:
   - Integration name
   - MCP server URL
   - Authentication credentials (API key or Bearer token)
3. System validates the URL speaks MCP protocol
4. Integration becomes available for users to assign to agents

**Scenario 2: Managing pre-defined MCP integrations**

1. Admin browses curated list of pre-defined MCP integrations (e.g., "GitHub MCP")
2. Admin selects an integration and provides required authentication credentials
3. Integration is enabled and becomes available organization-wide

**Scenario 3: Maintaining integrations**

1. Admin updates authentication credentials when API keys expire
2. Admin temporarily disables an integration without deleting it
3. Admin re-enables integration when needed

### Persona 2: End User

**Role**: Uses AI agents for daily tasks

**Scenario 1: Assigning MCP integrations to an agent**

1. User creates or edits an agent configuration
2. User navigates to the MCP tab in agent settings
3. User selects which MCP integrations (from org-enabled list) to assign to this agent
4. User saves agent configuration

**Scenario 2: Using an agent with MCP tools**

1. User starts a conversation with an agent that has MCP integrations assigned
2. User asks agent to perform a task requiring an MCP tool
3. Agent calls MCP server, receives response, and continues conversation
4. If MCP call fails, agent informs user of the error

**Scenario 3: Working with MCP resources**

1. User asks agent to retrieve data from an MCP resource (e.g., "Get the Q4 sales data CSV")
2. Agent requests CSV resource from MCP server
3. System automatically adds CSV as a thread source and processes it through RAG pipeline
4. Agent can now answer questions about the CSV data using RAG

## 3. Functional Requirements

### 3.1 MCP Capabilities Scope (v1)

**FR-1.1**: System MUST support MCP tools (executable functions)

- Agents can discover available tools from MCP servers
- Agents can execute MCP tools with parameters
- Tool results are returned to agents for processing

**FR-1.2**: System MUST support MCP resources (data/files)

- Agents can discover available resources from MCP servers
- Agents can retrieve resources by URI
- CSV resources are automatically processed as thread sources
- Text resources are returned directly in responses
- Other resource types (PDFs, images, binaries) are ignored in v1

**FR-1.3**: System MUST support MCP prompts (templates)

- Agents can discover available prompts from MCP servers
- Prompts are available programmatically to agents
- Prompts are NOT displayed in the user-facing prompt library

### 3.2 Integration Types

**FR-2.1**: System MUST support two types of MCP integrations:

1. **Pre-defined integrations**: Curated list hardcoded in codebase with fixed URLs
2. **Custom integrations**: Admin-provided URLs validated against MCP protocol

**FR-2.2**: Pre-defined integrations MUST:

- Have URLs and base configuration hardcoded in application code
- Require only authentication credentials from admins
- Start with zero pre-defined integrations (infrastructure first)

**FR-2.3**: Custom integrations MUST:

- Accept administrator-provided MCP server URLs
- Validate that the URL responds with valid MCP protocol before saving
- Reject invalid or non-responsive URLs with clear error messages

### 3.3 Authentication

**FR-3.1**: System MUST support two authentication methods:

1. API keys in custom headers (e.g., `X-API-Key: abc123`)
2. Bearer tokens in Authorization header (e.g., `Authorization: Bearer abc123`)

**FR-3.2**: Authentication credentials MUST:

- Be stored per organization (shared across all agents/users in the org)
- Be encrypted at rest in the database
- Be fully editable by org admins after initial setup

**FR-3.3**: System MUST NOT support (in v1):

- OAuth flows requiring user interaction
- Basic auth (username/password)
- Multi-step authentication flows

### 3.4 Organization Administration

**FR-4.1**: Org admins MUST be able to:

- Add new MCP integrations (pre-defined or custom)
- Edit existing MCP integrations (URL, auth, all settings)
- Enable/disable integrations without deleting them
- Delete integrations permanently
- View all integrations configured for their organization

**FR-4.2**: When creating an MCP integration, admins MUST provide:

- Integration name (display name)
- Integration type (pre-defined or custom)
- MCP server URL (if custom)
- Authentication method (API key or Bearer token)
- Authentication credentials (key/token value)
- Optional: custom header name (for API key auth)

**FR-4.3**: System MUST validate MCP integrations on creation:

- Connect to provided URL
- Verify server responds with valid MCP protocol handshake
- Return clear error if validation fails
- Save integration only if validation succeeds

**FR-4.4**: Disabled integrations MUST:

- Remain in the database with configuration intact
- Not appear in user's agent assignment interface
- Be quickly re-enable-able by admins

### 3.5 User Agent Assignment

**FR-5.1**: Users (not just admins) MUST be able to:

- View all enabled MCP integrations for their organization
- Assign MCP integrations to agents they create/edit
- Remove MCP integration assignments from their agents
- See which integrations are currently assigned to each agent

**FR-5.2**: Agent configuration UI MUST:

- Include a separate "MCP" section
- Display list of available (enabled) MCP integrations as toggleable entries in the section
- Allow multi-select assignment of integrations to the agent
- Show integration names and descriptions (not credentials)

**FR-5.3**: MCP tools from assigned integrations MUST:

- Appear in a separate "MCP Tools" category (distinct from native tools)
- Be clearly labeled with their source integration
- Be automatically available to agents during conversations

### 3.6 Runtime Behavior

**FR-6.1**: When an agent uses an MCP tool:

- System connects to MCP server with configured auth credentials
- Sends tool execution request with parameters
- Waits for response with 30-second timeout
- Returns result to agent or error if call fails
- Connection lifecycle management deferred to architecture phase

**FR-6.2**: When an agent requests an MCP resource:

- System connects to MCP server and requests resource by URI
- If resource MIME type is CSV:
  - System adds CSV as a thread source (data source) using existing source creation use cases
  - CSV becomes usable in code execution
- If resource MIME type is text/plain:
  - Content is returned directly to agent in response
- All other MIME types are ignored in v1

**FR-6.3**: CSV resources MUST:

- Be fetched fresh from MCP server on each request (no caching in v1)
- Be associated with the current thread as a source
- Be processed identically to user-uploaded CSV files
- Support all existing RAG functionality (semantic search, retrieval, etc.)

**FR-6.4**: When MCP calls fail:

- Error message is returned to the agent
- Agent can see the error and decide how to proceed
- User sees agent's response to the error
- No automatic retry logic in v1

**FR-6.5**: MCP prompts from assigned integrations MUST:

- Be discoverable programmatically by agents
- Be usable by agents to enhance their capabilities
- NOT appear in the user-facing prompt library UI

### 3.7 Security

**FR-7.1**: Custom MCP integration URLs MUST be validated:

- System connects to URL before saving integration
- System verifies valid MCP protocol response
- Invalid or unreachable URLs are rejected with clear error

**FR-7.2**: System MUST enforce 30-second timeout on all MCP server calls

- Prevents indefinite hangs on slow/unresponsive servers
- Returns timeout error to agent if exceeded

**FR-7.3**: Authentication credentials MUST:

- Be encrypted at rest in database
- Never be exposed in API responses to users
- Be visible only to org admins who configured them
- Be transmitted securely (HTTPS) to MCP servers

### 3.8 MCP Protocol Version

**FR-8.1**: System MUST implement the latest stable release of the MCP protocol specification at time of development through the official sdk

## 4. Non-Functional Requirements

### 4.1 Performance

- MCP tool calls MUST complete within 30 seconds or timeout
- MCP resource fetching MUST complete within 30 seconds or timeout
- CSV processing through RAG pipeline uses existing performance characteristics
- No caching of MCP responses in v1 (deferred to future optimization)

### 4.2 Reliability

- Failed MCP calls MUST return errors to agents gracefully
- System MUST continue functioning if MCP servers are unavailable
- Integration validation failures MUST not crash admin UI

### 4.3 Security

- All MCP communication SHOULD use HTTPS
- Authentication credentials MUST be encrypted at rest
- MCP server validation prevents saving invalid/malicious URLs

### 4.4 Maintainability

- Pre-defined integrations are hardcoded in codebase for easy version control
- Integration configuration is stored in database for runtime flexibility
- Clear separation between integration setup (admin) and assignment (user)

## 5. Acceptance Criteria

### AC-1: Pre-defined Integration Setup

- [ ] Org admin can view list of pre-defined MCP integrations (even if empty initially)
- [ ] Org admin can select a pre-defined integration and provide auth credentials
- [ ] System validates connection to pre-defined integration
- [ ] Integration appears as "enabled" in admin dashboard after successful setup

### AC-2: Custom Integration Setup

- [ ] Org admin can add custom MCP integration with name, URL, and auth
- [ ] System validates URL speaks MCP protocol before saving
- [ ] Invalid URLs are rejected with clear error message
- [ ] Valid custom integrations appear in admin dashboard
- [ ] Org admin can edit all fields of custom integration after creation

### AC-3: Integration Management

- [ ] Org admin can disable an integration (toggle off)
- [ ] Disabled integrations do not appear in user's agent assignment UI
- [ ] Org admin can re-enable a disabled integration (toggle on)
- [ ] Org admin can update auth credentials without recreating integration
- [ ] Org admin can delete integration permanently

### AC-4: User Agent Assignment

- [ ] User sees separate "MCP" tab/section in agent configuration UI
- [ ] User sees all enabled MCP integrations for their organization
- [ ] User can assign multiple MCP integrations to a single agent
- [ ] User can remove MCP integration assignments from agents
- [ ] User can see which integrations are assigned to each agent

### AC-5: MCP Tools Usage

- [ ] Agent with assigned MCP integration can discover available tools
- [ ] Agent can execute MCP tools with parameters
- [ ] Tool results are returned to agent successfully
- [ ] MCP tools appear in separate "MCP Tools" category
- [ ] Failed tool calls return error message to agent

### AC-6: CSV Resource Handling

- [ ] Agent can request CSV resource from MCP server
- [ ] CSV is automatically added as thread source
- [ ] CSV is processed through RAG pipeline (chunking, embeddings, indexing)
- [ ] Agent can query CSV data through RAG retrieval
- [ ] CSV handling matches existing user-uploaded CSV behavior

### AC-7: Text Resource Handling

- [ ] Agent can request text resource from MCP server
- [ ] Text content is returned directly to agent
- [ ] Agent receives text in response without additional processing

### AC-8: Error Handling

- [ ] MCP server unreachable: error returned to agent
- [ ] MCP server timeout (>30s): error returned to agent
- [ ] Invalid auth credentials: error returned to agent
- [ ] MCP tool execution error: error returned to agent with details

### AC-9: MCP Prompts

- [ ] Agent can discover available prompts from MCP server
- [ ] Agent can use prompts programmatically
- [ ] Prompts do NOT appear in user-facing prompt library

## 6. Out of Scope (Not in v1)

The following are explicitly NOT included in v1:

- **Resource caching**: All MCP requests are made fresh; no caching layer
- **Connection pooling**: Connection lifecycle management deferred to architecture
- **OAuth/complex auth**: Only API keys and Bearer tokens supported
- **Non-CSV/non-text resources**: PDFs, images, binaries ignored
- **User-level credentials**: All auth is org-level, not per-user
- **MCP prompt library integration**: Prompts available to agents but not in UI
- **HTTPS-only enforcement**: Security restrictions deferred (only validation required)
- **localhost/internal IP blocking**: No network restriction in v1
- **Admin override for security**: No bypass mechanisms
- **Automatic retry logic**: Single attempt per MCP call
- **Notification system**: No admin notifications for MCP failures
- **Auto-disable on repeated failures**: Manual admin intervention required
- **Pre-defined integrations**: Starting with zero, infrastructure only
- **Per-agent credentials**: All integrations use org-level auth

## 7. Open Questions

**Q1: Connection lifecycle management**

- Deferred to architecture phase
- Options: on-demand, persistent per conversation, connection pooling
- Decision needed based on MCP protocol best practices

**Q2: Future pre-defined integrations**

- Which MCP servers should be in curated list?
- Prioritize based on user demand and ecosystem maturity
- Revisit after v1 infrastructure is stable

**Q3: Resource type expansion**

- When should we add support for PDFs, images, other files?
- How should non-CSV files be processed (different RAG strategies)?
- Deferred pending v1 usage data

## 8. Assumptions

- **A1**: Organizations using MCP integrations have technical expertise to configure MCP servers
- **A2**: MCP protocol is stable enough to build production features on
- **A3**: MCP servers respond within 30 seconds for most operations
- **A4**: CSV resources from MCP servers are well-formed and compatible with existing RAG pipeline
- **A5**: Existing thread source and RAG use cases can be reused without modification
- **A6**: Users understand the distinction between native tools and MCP tools
- **A7**: Network connectivity between Ayunis and external MCP servers is generally reliable

## 9. Dependencies

### Internal Dependencies

- **Existing tools system**: MCP tools must coexist with native tools
- **Existing sources system**: CSV resources use existing source creation use cases
- **Existing RAG pipeline**: CSV processing depends on chunking, embeddings, indexing infrastructure
- **Authentication/authorization system**: Integration with org-level permissions
- **Agent configuration system**: MCP tab added to agent settings UI

### External Dependencies

- **MCP protocol specification**: Compliance with latest stable release
- **MCP server availability**: External servers must be accessible and responsive
- **Network connectivity**: HTTPS access to MCP servers
- **MCP ecosystem maturity**: Availability of useful MCP servers for users to integrate

## 10. Risks & Mitigation

### Risk 1: MCP Protocol Changes

**Impact**: High - Breaking changes could require significant rework
**Probability**: Medium - Protocol is evolving
**Mitigation**:

- Target latest stable release, not draft specs
- Monitor MCP protocol development
- Design with abstraction layer for protocol version handling

### Risk 2: External MCP Server Reliability

**Impact**: Medium - Poor UX if servers frequently fail
**Probability**: Medium - External dependencies are unpredictable
**Mitigation**:

- 30-second timeout prevents indefinite hangs
- Clear error messages help users diagnose issues
- Future: implement retry logic and circuit breakers

### Risk 3: Security Vulnerabilities via Custom URLs

**Impact**: High - Malicious MCP servers could return harmful content
**Probability**: Low - Validation reduces risk
**Mitigation**:

- Validate MCP protocol on integration creation
- Future: add HTTPS-only enforcement, internal IP blocking, response sanitization

### Risk 4: CSV Processing Performance

**Impact**: Medium - Large CSV files could slow RAG pipeline
**Probability**: Medium - Depends on CSV size
**Mitigation**:

- Leverage existing RAG pipeline optimizations
- Future: implement file size limits, streaming processing

### Risk 5: User Confusion Between Tool Types

**Impact**: Low - Users might not understand native vs MCP tools
**Probability**: Medium - New concept
**Mitigation**:

- Clear separation in UI ("MCP Tools" category)
- Label tools with source integration
- Documentation and user education

### Risk 6: Authentication Credential Management

**Impact**: Medium - Expired/invalid credentials break integrations
**Probability**: High - Credentials expire regularly
**Mitigation**:

- Allow admins to update credentials without recreating integrations
- Future: credential validation/expiration warnings
- Clear error messages when auth fails

## 11. Success Criteria

This feature will be considered successful when:

1. **Technical Success**:
   - At least one custom MCP integration can be configured and used end-to-end
   - Agents can execute MCP tools and retrieve resources reliably
   - CSV resources are processed through RAG pipeline successfully
   - System handles MCP failures gracefully without crashes

2. **User Success**:
   - Org admins can configure MCP integrations without developer assistance
   - Users can assign integrations to agents intuitively
   - Agents can leverage MCP capabilities transparently during conversations
   - Clear error messages enable troubleshooting without support tickets

3. **Business Success**:
   - Feature enables new use cases not possible with native tools
   - Reduces need for custom tool development for common integrations
   - Positions Ayunis as MCP-compatible in the ecosystem
   - Provides foundation for expanding MCP capabilities in future releases

## 12. Timeline & Phasing

### Phase 1: Foundation (v1 - This PRD)

- MCP protocol integration infrastructure
- Custom integration setup by org admins
- User agent assignment
- MCP tools execution
- MCP resources (CSV + text)
- MCP prompts (programmatic only)

### Phase 2: Optimization (Future)

- Response caching
- Connection pooling
- Retry logic and circuit breakers
- Enhanced security (HTTPS-only, IP blocking)
- Performance monitoring and metrics

### Phase 3: Expansion (Future)

- Pre-defined integration catalog
- Additional resource types (PDF, images)
- MCP prompt library integration
- Per-user credential support
- Advanced auth methods (OAuth)

## 13. Appendix

### MCP Protocol Resources

- Official specification: [To be added during architecture phase]
- Reference implementations: [To be added during architecture phase]
- Community resources: [To be added during architecture phase]

### Related Ayunis Documentation

- Existing tools system: `src/domain/tools/`
- Existing sources system: `src/domain/sources/`
- Existing RAG pipeline: `src/domain/rag/`
- Agent configuration: `src/domain/agents/`

---

**Document Status**: Draft - Ready for Architecture Design
**Last Updated**: 2025-10-27
**Author**: Claude & Daniel
**Next Step**: Architecture Design Specification
