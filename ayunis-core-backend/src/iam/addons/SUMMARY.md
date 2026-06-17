# Addons

Per-organization **add-ons** that super admins activate and deactivate. The
add-on catalog is the hardcoded `AddonType` enum (currently only
`ayunis_core_academy` — Ayunis Core Academy).

## Model

- `OrgAddon` — `{ id, orgId, type }`, one row per active (org, add-on) pair
  with `UNIQUE(orgId, type)`.
- **Row exists = active.** Activation inserts the row, deactivation deletes it.
  Both operations are idempotent: re-activating an active add-on (or
  re-deactivating an inactive one) is a no-op and emits no event.

## Events

On a real state change the use cases emit fire-and-forget domain events that
the webhooks module relays to the configured webhook endpoint:

- `addon.activated` (`AddonActivatedEvent`)
- `addon.deactivated` (`AddonDeactivatedEvent`)

Payload: `{ orgId, addonType, actorUserId }` — `actorUserId` is the super
admin who flipped the toggle.

## Management

Super-admin only — `SuperAdminAddonsController`
(`super-admin/addons/:orgId`, `@SystemRoles(SUPER_ADMIN)`): list the full
catalog with active flags / activate (`POST :orgId/:type`) / deactivate
(`DELETE :orgId/:type`). There is no org-facing surface yet; feature gating
on active add-ons comes with the first concrete add-on implementation
(`ListOrgAddonsUseCase` is exported for that purpose).

## Layout

Standard hexagonal: `domain/` (entity, `AddonType` enum, `AddonStatus`),
`application/` (repository port, use-cases, events, errors), `infrastructure/`
(Postgres record + mapper + repository), `presenters/http/` (super-admin
controller + DTO).
