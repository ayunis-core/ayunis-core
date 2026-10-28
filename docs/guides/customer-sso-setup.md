# Set up single sign-on for your organization

Single sign-on (SSO) lets your employees sign in to Ayunis Core with their
existing work account. Ayunis supports identity providers that use **OpenID
Connect (OIDC)** or **SAML**.

Ayunis will guide your IT team through the setup and provide the values that
must be entered in your identity provider. No changes are made to your current
login until we have tested the connection together.

## What we need from you

Please send us the following non-sensitive information:

- the name of your organization;
- the email domain or domains your employees use, for example
  `example-city.de`;
- the name and email address of your technical contact;
- the name of your identity provider, for example Microsoft Entra ID;
- whether your identity provider supports OIDC, SAML, or both;
- one or more test users from the stated email domain; and
- your preferred onboarding option:
  - **Invite only:** users must be invited to Ayunis Core before their first
    SSO login.
  - **Automatic onboarding:** employees with an approved email domain can be
    created automatically when they first sign in. Automatically created users
    receive the standard user role.

Users who need an administrator or manager role should be invited with that
role before their first login.

## Identity-provider information

Your IT team will also need to provide configuration information for the chosen
protocol.

### OpenID Connect (OIDC)

We normally need:

- the issuer or discovery URL;
- the client ID; and
- the client secret.

### SAML

We normally need:

- the identity-provider metadata URL or metadata file; and
- the signing certificate if it is not included in the metadata.

Ayunis will provide the environment-specific callback or metadata values that
your IT team must register. Staging and production use separate values.

> Do not send client secrets, private keys, certificates containing private
> keys, passwords, tokens, or other credentials by email or in a support
> ticket. Your Ayunis contact will arrange an approved secure exchange.

## Requirements for user accounts

For a successful login, the identity provider must return the user's work email
address and confirm that the address is verified. The email domain must match
one of the domains approved for your organization.

Access to Ayunis Core remains subject to the available licenses or seats in your
organization.

## Setup process

1. **Initial coordination** — We confirm your domains, technical contacts,
   identity provider, protocol, onboarding preference, and test users.
2. **Exchange configuration** — Ayunis provides the required callback or
   metadata values. Your IT team provides the corresponding identity-provider
   configuration through the agreed secure channel.
3. **Configure and test** — Ayunis configures the connection and tests it with
   the named test users. Existing password login remains available during this
   step.
4. **Acceptance** — Together we verify sign-in, user onboarding, assigned roles,
   multi-factor authentication where applicable, and logout.
5. **Go live** — Ayunis enables SSO for the approved email domains.

## Password login after setup

By default, SSO is added alongside the existing Ayunis password login. If your
organization requires SSO for all users, Ayunis can disable password login only
after the SSO connection has been tested and approved.

Requiring SSO affects all users in the organization. Ayunis will review the
change and recovery options with your technical contact before enabling it.

## Checklist for your IT team

- [ ] Authorized requester confirmed
- [ ] Technical contact named
- [ ] Email domains listed
- [ ] Identity provider and protocol selected
- [ ] Invite-only or automatic onboarding selected
- [ ] Test users named
- [ ] OIDC or SAML configuration prepared
- [ ] Secure channel agreed for sensitive information
- [ ] Staging test completed, if applicable
- [ ] Production acceptance test scheduled

## Need help?

Contact your Ayunis representative or [help@ayunis.com](mailto:help@ayunis.com).
Please do not include credentials or other secrets in your message.
