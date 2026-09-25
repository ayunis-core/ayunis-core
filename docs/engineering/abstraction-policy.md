# Abstraction Policy

Abstractions are a maintenance tool, not a goal. Similar-looking code should
only be shared when it has the same reason to change.

## Decision rules

- **One use:** keep the code concrete.
- **Two uses:** tolerate duplication unless it is already costly or risky.
- **Three or more uses:** consider abstraction when the copies share the same
  business meaning and the same likely future changes.
- **Same shape, different meaning:** do not abstract. Prefer clear duplication
  over a generic helper that hides domain differences.
- **One-caller abstraction:** inline or keep module-local unless it expresses a
  stable domain concept.

## Preferred extraction order

1. Extract inside the owning module first.
2. Promote to a feature/widget/shared layer only after multiple modules need the
   same behavior.
3. For backend code, keep domain/application logic independent of infrastructure
   dependencies.
4. For frontend code, prefer small shared primitives/hooks over broad generic
   components.

## Review output

Architecture hygiene reviews should classify findings as one of:

- `ignore`
- `acceptable-duplication`
- `wait-for-third-use`
- `abstraction-candidate`
- `over-abstraction-candidate`
- `infrastructure-leakage`

Reviews are advisory. They should create evidence-backed reports and follow-up
Linear tickets after human approval, not automatic refactor PRs.
