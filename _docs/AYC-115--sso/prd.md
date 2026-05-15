# PRD: SSO via Zitadel

**Ticket:** AYC-115
**Status:** Draft — awaiting architecture review
**Author:** Requirements clarified with product owner, 2026-04-23

---

## 1. Problem Statement

Ayunis Core currently offers only local email/password authentication managed inside the `iam/authentication` module. Enterprise prospects and customers — specifically those on **credit-based plans** (our larger-customer segment) — increasingly demand SSO as a prerequisite for adoption because:

- **Central identity governance:** IT teams require that user accounts are created, disabled, and audited from a single source of truth (their corporate IdP).
- **Compliance:** Internal policies (ISO 27001, SOC2, industry-specific regulations) mandate that third-party SaaS tools federate with the corporate IdP rather than hold independent credentials.
- **User experience:** Employees expect to access ayunis with the same credentials and MFA flows they already use elsewhere.
- **Consistency across ayunis products:** We want to standardize on **Zitadel** as our federation broker, so that each customer only integrates once regardless of which ayunis product(s) they use.

Without SSO, enterprise deals stall or require custom workarounds. Adding SSO via Zitadel unblocks the enterprise sales motion while leaving the local-auth flow untouched for smaller / self-service customers.

---

## 2. Personas

| Persona | Description | Relevance |
|---|---|---|
| **Org Admin (Enterprise)** | Admin of an org on a credit-based plan. Configures org settings, subscription, members. | Primary — configures and enables SSO for their org. |
| **Enterprise End User** | Regular member of an enterprise org. Uses ayunis in daily work. | Primary — logs in via SSO. |
| **Ayunis Super Admin** | Ayunis platform operations / support team. | Secondary — supports SSO config issues, audits. |
| **Local-auth User (existing)** | Existing user in an org that later enables SSO. | Secondary — continues to work in dual mode. |

Out of scope: Small / self-service customers on seat-based plans. They continue to use local auth only.

---

## 3. User Scenarios and Flows

### 3.1 Persona: Org Admin (Enterprise)

#### Scenario A1 — Enable SSO for my org

**Why:** The admin's IT department has mandated SSO and has a Zitadel instance (cloud or self-hosted) ready. The admin wants to wire ayunis up to it.

**Steps (high-level, implementation-agnostic):**
1. Admin navigates to **Org Settings → Authentication / SSO**.
2. Admin enters the Zitadel configuration values needed to establish a trust relationship (issuer/metadata, client identifiers, secrets — exact fields depend on chosen protocol; see open questions).
3. Admin selects the **provisioning mode** for the org: **JIT** or **invite-required** (see Scenario B1).
4. Admin clicks **Test connection**. The system performs a live validation against Zitadel and reports success or a specific error.
5. Admin clicks **Save**. SSO is now enabled **alongside** local auth (dual mode — see NFR-COEXIST).
6. The system emits an audit event recording who changed SSO config and when.

##### Functional Requirements

- **FR-A1.1** The SSO configuration UI MUST be available only to users with org-admin role within an org that is on a credit-based plan. Seat-based / trial plans MUST NOT see the SSO section (or MUST see it disabled with an upgrade hint — to be decided in UX).
- **FR-A1.2** The system MUST accept and persist the full set of Zitadel configuration fields required by the chosen protocol(s) per org.
- **FR-A1.3** Secret values (e.g. OIDC client secret) MUST be write-only from the UI: once saved, the field MUST display a masked placeholder and the clear-text value MUST NOT be readable by any user, including super-admins, via the UI or API.
- **FR-A1.4** The **Test connection** action MUST verify, at minimum, that the configured issuer/metadata endpoint is reachable, that discovery/metadata parses successfully, and that the configured credentials are accepted by Zitadel. On failure, a specific, actionable error message MUST be shown (e.g. "Issuer URL unreachable", "Client secret rejected", "Discovery document missing required endpoint").
- **FR-A1.5** SSO MUST NOT be enabled if **Test connection** has never succeeded for the current configuration.
- **FR-A1.6** Saving, updating, enabling, disabling, or testing SSO configuration MUST produce an audit log entry containing: timestamp, acting user, org, action, and a diff of non-secret fields.
- **FR-A1.7** The admin MUST be able to choose the provisioning mode (JIT vs invite-required) when enabling SSO, and change it later.

##### Non-Functional Requirements

- **NFR-A1.1** Test connection MUST return within 10 seconds or time out with a clear message.
- **NFR-A1.2** SSO configuration writes MUST be transactional: a partially saved config must never leave the org in an inconsistent state.
- **NFR-A1.3** Secrets MUST be encrypted at rest using the same encryption primitive already used by the codebase for other sensitive values (TBD in architecture — check existing patterns e.g. MCP OAuth secrets).

##### Acceptance Criteria

- Given I am an org admin on a credit-based plan, when I enter a valid Zitadel config and click Test connection, the system reports success and I can save and enable SSO.
- Given I am an org admin on a credit-based plan, when I enter an invalid issuer URL, Test connection fails with a message identifying the issuer URL as the problem, and I cannot enable SSO.
- Given SSO is enabled for my org, when I reopen the SSO settings page, the client secret field is masked and I cannot read the original value.
- Given I change the client secret and click Save, an audit entry is recorded with my user id, timestamp, and the fact that "client_secret" was changed (without logging the value itself).
- Given I am on a seat-based plan, I either do not see the SSO section at all, or I see it clearly marked as not available on my plan.

##### Dependencies

- Existing `iam/authentication` module (for integration).
- Existing `iam/orgs` module (org settings ownership).
- Existing encryption utility for at-rest secret storage (confirm in architecture).
- Existing audit log mechanism, if present; else create one as part of this feature (see open questions).

##### Assumptions

- Subscriptions module can expose a reliable "is this org on a credit-based plan" signal.
- Org admins have the skills and access to obtain Zitadel config values from their IT team.

---

#### Scenario A2 — Change or disable SSO

**Why:** A client secret rotates, the Zitadel instance is migrated, or the admin wants to turn SSO off (e.g. during migration).

##### Functional Requirements

- **FR-A2.1** Org admin MUST be able to edit any SSO config field at any time. Editing a secret field MUST require re-entering the new value (no partial updates that leave a mismatched state).
- **FR-A2.2** Org admin MUST be able to **disable** SSO for the org with a single action. When disabled, existing users fall back to local-password auth if they have one set.
- **FR-A2.3** If an org has **JIT-provisioned users with no local password** at the time SSO is disabled, the system MUST either (a) prevent disabling until those users have an alternative credential path, or (b) trigger a password-set flow for those users on their next login. The chosen behavior MUST be explicit in the UI (e.g. warning dialog listing affected users).
- **FR-A2.4** Disabling SSO MUST invalidate any in-flight SSO login attempts for that org and MUST be reflected at the audit log.

##### Acceptance Criteria

- Given SSO is enabled and I rotate the client secret, when I save, existing user sessions remain valid, but new SSO logins use the new secret.
- Given I try to disable SSO while JIT users exist without passwords, I see a warning identifying the risk and must explicitly confirm.
- Given I disable SSO, the next login attempt for an SSO-only user behaves per FR-A2.3, not per silent failure.

##### Dependencies

- Password-reset flow already exists in `iam/users` — reuse for the JIT fallback case.

##### Assumptions

- It is acceptable for a user to exist with neither a password nor a usable SSO path for a brief window, as long as a recovery email flow can restore access.

---

#### Scenario A3 — View SSO audit log

**Why:** Admin needs to demonstrate to their security team who configured SSO and who has authenticated via SSO.

##### Functional Requirements

- **FR-A3.1** Org admin MUST be able to see, for their org, a chronological list of: SSO config changes, successful SSO logins, and failed SSO login attempts. Each entry MUST include timestamp, actor (user or "anonymous"), action, and relevant non-secret metadata (e.g. reason for failure).
- **FR-A3.2** The audit log MUST be retained for **at least 90 days** (confirm retention with compliance).
- **FR-A3.3** The audit log MUST NOT expose PII of users who attempted but failed to authenticate beyond the email they entered.

##### Non-Functional Requirements

- **NFR-A3.1** Audit log queries for an org MUST return within 2 seconds for up to 90 days of data at expected login volumes.

##### Acceptance Criteria

- Given I am an org admin, when I open the SSO audit tab, I see my config changes and SSO login events for my org only (not other orgs).
- Given a user failed SSO login due to "user disabled in Zitadel", I see that reason in the audit log.

##### Dependencies

- Audit logging infrastructure (confirm existing vs new — open question).

---

### 3.2 Persona: Enterprise End User

#### Scenario B1 — First-time SSO login (JIT provisioning)

**Why:** A new employee at an SSO-enabled org needs to access ayunis for the first time. Their org has JIT enabled, so no invite is required.

**Steps:**
1. User navigates to ayunis login page.
2. User either (a) enters their work email and the system recognizes the SSO domain/tenant, or (b) uses a tenant-scoped URL that implies their org. **(Exact routing mechanism is an open architecture question — see §8.)**
3. User is redirected to Zitadel to authenticate (may include MFA, social login, passkey — all owned by Zitadel).
4. User is redirected back to ayunis with a successful authentication assertion.
5. If no ayunis user exists for this identity and org: ayunis creates the user account (JIT), assigns the org's **default role**, and inherits the org-level legal-acceptance state (see FR-B1.4).
6. User lands in the app, authenticated.

##### Functional Requirements

- **FR-B1.1** SSO login MUST succeed only if the authenticated Zitadel identity can be unambiguously mapped to one ayunis org that has SSO enabled with a matching configuration. If mapping is ambiguous, the user MUST see an actionable error (e.g. "Multiple ayunis orgs are configured for this identity — contact your admin").
- **FR-B1.2** JIT provisioning MUST only create a user if the org has JIT enabled (per FR-A1.7). If the org is on invite-required mode and no pending invite matches the identity, login MUST fail with a clear "You must be invited to this organization" message, and MUST NOT create a user record.
- **FR-B1.3** Roles and team memberships for JIT-provisioned users MUST be managed entirely within ayunis-core. Zitadel claims other than identity (email, sub, name) MUST NOT drive authorization in v1.
- **FR-B1.4** For orgs where the admin accepted legal terms on behalf of the org (implicit mode — the chosen default per requirements session), JIT-provisioned users MUST inherit that acceptance and MUST NOT be shown a per-user legal-acceptance screen.
- **FR-B1.5** Credit-based plans do not enforce per-seat limits, so JIT provisioning MUST NOT block on a seat-count check. (Seat-based plans are out of scope — see §6.)
- **FR-B1.6** On successful SSO login, ayunis MUST establish its own session using the existing JWT / cookie mechanism. The ayunis session lifetime MUST follow existing session policy and MUST NOT automatically track the Zitadel session lifetime in v1.

##### Non-Functional Requirements

- **NFR-B1.1** End-to-end SSO login (click login → land in app) MUST complete within 5 seconds on the 95th percentile, excluding time spent on the Zitadel login screen itself.
- **NFR-B1.2** Tokens / codes received from Zitadel MUST NOT be logged in plain text.
- **NFR-B1.3** The authorization-code exchange with Zitadel MUST be performed server-side only.
- **NFR-B1.4** The flow MUST be resistant to standard OIDC attack classes: state/nonce validation, PKCE where applicable, strict redirect URI allowlisting. (SAML equivalents apply if SAML is in scope.)

##### Acceptance Criteria

- Given my org has SSO enabled and JIT on, when I authenticate through Zitadel for the first time, a user record is created for me with the org's default role and I am logged into ayunis.
- Given my org has SSO enabled and JIT off, when I authenticate through Zitadel without a pending invite, I am not logged in, I see a clear error, and no user record is created in ayunis.
- Given the Zitadel redirect comes back with a tampered state parameter, the login MUST fail and the incident MUST be logged.

##### Dependencies

- `iam/users` (user creation).
- `iam/orgs` (org default role, legal acceptance state).
- Org routing mechanism (open question — §8).

##### Assumptions

- The email claim from Zitadel is verified. Ayunis trusts this and does not run its own email confirmation for SSO users.

---

#### Scenario B2 — Invited user completes signup via SSO

**Why:** An admin invites a user on an invite-required SSO org. The invitee should authenticate via SSO instead of setting a local password.

Note: product owner flagged this as "needs discussion with engineering" — included here as a requirement rather than a v1 commitment. May land in v1 only if implementation cost is low given the invite-required mode is already a supported configuration (FR-A1.7).

##### Functional Requirements

- **FR-B2.1** When an invitee clicks the invite link for an SSO-enabled org on invite-required mode, the flow MUST direct them to SSO login rather than to a set-password screen.
- **FR-B2.2** Upon successful SSO login, the invite MUST be consumed and the user MUST be associated with the inviting org.
- **FR-B2.3** If the email returned by Zitadel does not match the invited email, the flow MUST fail with a clear error and MUST NOT consume the invite.

##### Acceptance Criteria

- Given I receive an invite to an SSO+invite-required org, when I follow the link and authenticate via Zitadel with a matching email, my account is created and associated with that org.
- Given my Zitadel email does not match my invited email, I see an error and remain un-provisioned.

##### Dependencies

- Existing `iam/invites` module.

##### Assumptions

- Invite uniqueness is enforced on email; matching email is sufficient identity verification for consuming an invite.

---

#### Scenario B3 — Returning SSO user login

**Why:** An existing SSO user returns to ayunis in a new browser session.

##### Functional Requirements

- **FR-B3.1** A returning SSO user MUST be able to re-authenticate via SSO without any additional ayunis-side configuration.
- **FR-B3.2** Subsequent SSO logins MUST reuse the existing ayunis user record (matched by stable Zitadel subject + org) without creating duplicates.

##### Acceptance Criteria

- Given I have logged in via SSO before, when I log in again in a fresh browser, my ayunis user record is reused and my data is intact.
- Given my email in Zitadel changed but my subject did not, I am still matched to the same ayunis user.

##### Dependencies / Assumptions

- Ayunis stores a stable external identifier (Zitadel `sub`) on the user record to enable matching independent of email changes.

---

#### Scenario B4 — Dual-mode user chooses local or SSO

**Why:** An existing org enables SSO. Existing local-password users are not forced to migrate.

##### Functional Requirements

- **FR-B4.1** Users belonging to an SSO-enabled org MUST retain the ability to log in with their existing local password **unless** the org admin explicitly removes their password (not in v1).
- **FR-B4.2** The ayunis login page MUST offer both paths to users in dual-mode orgs: SSO and local password. The exact UI (one button vs. two vs. email-first routing) is a UX decision.
- **FR-B4.3** Account-matching between local-auth and SSO-auth MUST be done by email address: the same email MUST map to the same ayunis user regardless of which path was used.

##### Acceptance Criteria

- Given I am a long-time user of an org that just enabled SSO, I can still log in with my password, AND I can log in with SSO, and both paths land me in the same user account.

##### Risks / Trade-offs (flagged to architecture)

- **RISK-B4.A** Dual-mode weakens Zitadel-driven deprovisioning. If a user is disabled in Zitadel but still has a local password, they can continue to access ayunis. This is a known and accepted trade-off for v1; admins who need hard deprovisioning must manually deactivate the ayunis user or wait for a future release that supports SSO-only orgs.

---

#### Scenario B5 — User session lifetime after Zitadel deactivation

**Why:** Employee leaves the company. IT disables them in Zitadel. Their current ayunis session should eventually go away.

##### Functional Requirements

- **FR-B5.1** Ayunis MUST NOT perform real-time synchronization with Zitadel in v1. No SCIM, no background polling.
- **FR-B5.2** The disabled user's current ayunis session MUST remain valid until natural expiry according to existing session/JWT TTL.
- **FR-B5.3** Upon session expiry, any attempt to re-authenticate via SSO MUST fail because Zitadel will reject the authentication. The user's ayunis user record remains but becomes unreachable via SSO. The org admin may explicitly deactivate/remove the user in ayunis.

##### Acceptance Criteria

- Given a user is disabled in Zitadel, when their ayunis session expires, they cannot log back in via SSO.
- Given a user is disabled in Zitadel but still has a local password (dual mode), they CAN still log in via local password. This is a known limitation.

##### Dependencies / Assumptions

- Current ayunis session TTL is short enough to be acceptable for enterprise offboarding. If not, session TTL should be discussed separately — it is out of scope for this PRD.

---

### 3.3 Persona: Ayunis Super Admin

#### Scenario C1 — Support / troubleshoot SSO

##### Functional Requirements

- **FR-C1.1** Super-admins MUST be able to view the non-secret parts of any org's SSO config for support purposes.
- **FR-C1.2** Super-admins MUST NOT be able to read secret values (same masking as org admins — see FR-A1.3).
- **FR-C1.3** Super-admins MUST be able to force-disable SSO for an org (emergency switch) and MUST leave an audit entry recording the intervention.

##### Acceptance Criteria

- Given I am a super-admin helping an org debug a failed SSO rollout, I can see issuer URL, client ID, provisioning mode, and recent SSO login failures for that org, without being able to read the client secret.

---

## 4. Cross-Cutting Non-Functional Requirements

- **NFR-COEXIST** SSO and local auth MUST coexist: enabling SSO for an org MUST NOT break existing local-password logins, and MUST NOT require any user action for users who choose to keep using passwords.
- **NFR-SCOPE-PLAN** SSO availability MUST be tied to the credit-based plan. The gating signal comes from the existing subscriptions module.
- **NFR-SECURITY-1** All SSO secrets MUST be encrypted at rest. Plaintext secrets MUST NOT be written to logs, error messages, audit entries, or observability tooling.
- **NFR-SECURITY-2** The SSO flow MUST enforce standard anti-CSRF / anti-replay protections for the chosen protocol.
- **NFR-COMPAT** Existing users, orgs, and authentication flows MUST continue to work unchanged when SSO is not enabled. No user-visible regression for the local-auth path is acceptable.
- **NFR-TESTABILITY** The integration MUST be testable end-to-end against a Zitadel instance in CI or local dev. Providing such an instance (e.g. via docker-compose) is part of the implementation.

---

## 5. In Scope for v1

Confirmed in scope by product owner:

1. **SSO login flow** for org members (Scenarios B1, B3, B4, B5).
2. **Org-admin self-service SSO configuration UI** (Scenario A1, A2).
3. **Test-connection action** in the admin UI (FR-A1.4).
4. **JIT user provisioning**, configurable per org (FR-A1.7, FR-B1.2).
5. **Audit log** of SSO config changes and SSO login events (Scenario A3).
6. **SAML 2.0 support** in addition to OIDC — **subject to architecture assessment**. Product has selected it as a v1 must-have, but engineering will evaluate cost and may carve it out if it materially delays v1 (see §8).

---

## 6. Out of Scope (v1)

Explicitly NOT in this release, deferred to later:

- **Invited user completes signup via SSO (Scenario B2).** Included in this PRD as a requirement for future work; v1 commitment pending engineering discussion.
- **Single Logout (SLO).** Logging out of ayunis does not log the user out of Zitadel. To be revisited based on customer demand.
- **SCIM auto-provisioning / deprovisioning.** No real-time sync of user lifecycle from Zitadel to ayunis. Deprovisioning relies on session expiry (Scenario B5).
- **Multiple IdPs per org.** Each org has one Zitadel configuration.
- **Zitadel claim-based role or team mapping.** All authorization stays inside ayunis-core (FR-B1.3).
- **SSO for seat-based plans / trial / small-business tiers.** SSO is a credit-based-plan feature.
- **SSO-only orgs (no local password).** Dual-mode is the only supported configuration in v1 (FR-B4.1).
- **Forced migration of existing users to SSO.** Users continue to use whatever they had (FR-B4.1).
- **Break-glass / emergency admin access for SSO-only orgs.** Not applicable in v1 because v1 is dual-mode only. Will become relevant when SSO-only orgs are introduced.
- **Integrations other than Zitadel** (Okta, Entra ID direct, Auth0 direct). Zitadel is our broker; customers federate their upstream IdPs into their own Zitadel.

---

## 7. Assumptions

- **A1** Customers on credit-based plans are the only target for v1; subscription module can reliably flag this.
- **A2** Each customer will bring their own Zitadel instance (cloud or self-hosted) — ayunis does not host Zitadel for them.
- **A3** Zitadel is the single broker. If a customer's real IdP is Entra/Okta/etc., they are responsible for federating it into their Zitadel. Ayunis never talks to the upstream IdP directly.
- **A4** The email claim returned by Zitadel is verified and trustworthy.
- **A5** The org admin has sufficient access at the customer's Zitadel to create the required application/client and obtain credentials.
- **A6** Org admin accepts legal terms on behalf of the org; individual JIT users do not need a separate legal-acceptance step (per product decision).
- **A7** Current ayunis session TTL is considered acceptable for enterprise offboarding in dual-mode. (If not, addressed outside this PRD.)

---

## 8. Open Questions (for Architecture)

These require a decision from engineering in the architecture document:

- **OQ-1 — Protocol support.** Product selected OIDC + SAML 2.0 as v1 must-haves. Architecture must decide whether both ship together or whether SAML is deferred to v1.1 based on implementation cost.
- **OQ-2 — Org routing / IdP discovery.** How does the login flow know which org's Zitadel config to use when a user starts a login? Preferred options from product are:
  - (a) email domain mapping (user types email → system resolves org), or
  - (b) tenant subdomain (URL implies the org).
  - Architecture to pick one (or both) based on impact on existing deployment topology and cost.
- **OQ-3 — Logout behavior.** Local-logout-only vs OIDC end-session / SAML SLO. Product is neutral; architecture to recommend based on effort and customer-compliance impact.
- **OQ-4 — Break-glass access.** Not applicable in v1 (dual-mode), but architecture should note the path for future SSO-only support.
- **OQ-5 — Audit log infrastructure.** Does a reusable audit-log capability already exist in ayunis-core, or must this feature build one? If building one, architecture should decide whether to scope it narrowly to SSO or design it as a shared facility.
- **OQ-6 — Secret storage.** Confirm the existing encryption-at-rest pattern (e.g. the one used for MCP OAuth credentials) is reusable for Zitadel client secrets, or specify a new approach.
- **OQ-7 — User external-identity model.** Architecture should specify how Zitadel `sub` + org maps to an ayunis user (new table vs column on `users`), and how this coexists with email-based local-auth matching (FR-B4.3).

---

## 9. Success Criteria

v1 is successful when:

- An enterprise prospect on a credit-based plan can be configured with Zitadel SSO end-to-end by their own org admin, without ayunis ops intervention, in under 30 minutes.
- An enterprise user can log into ayunis via their corporate Zitadel with no more friction than their other SSO-enabled SaaS tools.
- No regression is observed on the local-auth path for existing users.
- Security review passes on secret handling, session handling, and redirect URI management.
- Audit log satisfies the "who configured SSO and who logged in" evidence needed by customer security reviews.

---

## 10. Glossary

- **Zitadel** — open-source identity and access management platform, used here as the identity broker between ayunis-core and enterprise customers' upstream IdPs.
- **SSO** — Single Sign-On. One login at the IdP grants access to multiple services.
- **OIDC** — OpenID Connect, an identity layer on top of OAuth 2.0.
- **SAML** — Security Assertion Markup Language, an older enterprise federation standard.
- **JIT provisioning** — Just-In-Time: creating the local user record the first time the user authenticates via SSO.
- **SCIM** — System for Cross-domain Identity Management: a standard for IdPs to push user lifecycle changes to SaaS apps. Out of scope for v1.
- **SLO** — Single Logout: terminating all federated sessions from a single logout action. Out of scope for v1.
- **Dual mode** — Org configuration where both local password auth and SSO are accepted.
