# Crawl Domain Grants

Binds individual **hosts to a single organization** so that a customer-provided
domain (e.g. an internal intranet) can only be crawled by that customer's org;
every other org is denied with a 404.

## Why

URL crawling fetches arbitrary hosts with no tenancy check. Once the backend can
reach a customer's intranet, any org could otherwise crawl it. A grant locks a
host to one org.

## Model

- `CrawlDomainGrant` — `{ id, orgId, domain }`, one row per grant.
- `domain` is a normalized exact host (lowercased, no scheme/port/path) and is
  **globally unique** (`UNIQUE(domain)`) → a host belongs to at most one org.
- **Exact-host** matching only — a grant for `intranet.customer.de` does not
  cover `wiki.customer.de`.

## Enforcement (the point of this module)

`AssertCrawlDomainAccessUseCase` is the enforcement primitive, called from the
`url-retrievers` `RetrieveUrlUseCase` chokepoint (which both the knowledge-base
URL-source path and the `website_content` tool path flow through):

- host has no grant → allowed (public web unchanged)
- host granted to the requesting org → allowed
- host granted to another org → `CrawlDomainAccessDeniedError` (404)

## Management

Super-admin only — `SuperAdminCrawlDomainsController`
(`super-admin/crawl-domains/:orgId`, `@SystemRoles(SUPER_ADMIN)`): list / grant
(409 if the domain is already assigned elsewhere) / revoke. There is no
org-facing surface.

## Layout

Standard hexagonal: `domain/` (entity, `normalizeHost` util, validation error),
`application/` (ports, use-cases, HTTP-mapped errors), `infrastructure/` (Postgres
record + mapper + repository), `presenters/http/` (super-admin controller + DTOs).
