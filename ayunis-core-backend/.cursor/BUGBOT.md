# NestJS Backend Bugbot Policy

## Change-triggered architectural reassessment

Does this PR invalidate a simplifying assumption in the existing design? Look for a second provider or consumer, duplicated orchestration, broader reuse of provider-specific infrastructure, or new listeners entering a transaction-sensitive workflow. If the change crosses such a threshold, check whether responsibilities and contracts should now be separated or made explicit. A second consumer alone does not require an abstraction.

Flag only concrete coupling, duplication, or correctness risks introduced or materially expanded by this PR. Identify the original assumption, how this change invalidates it, and the smallest sufficient adjustment. Do not recommend speculative abstractions for hypothetical future growth.

Examples:

- **Flag:** a second billing provider duplicates subscription/trial/add-on orchestration previously owned by the first provider.
- **Flag:** a new external event listener enters a transactional dispatch path without an explicit post-commit delivery contract.
- **Do not flag:** one provider owns its own synchronization workflow and outbox, with no competing consumer or duplicated policy.

The question is "Has this change made the existing compromise inappropriate?", not "Could this architecture be more generic?"

## Existing backend checks

- Modules should depend on each other's use cases when they need something from another module. A module should never import the repository or any other port of another module directly. Instead, the other module should expose a use case which the first module uses
- A module must never export its repository (or any other port). If a module exports its repository so that another module can use it directly, flag this as an issue — inter-module communication must go through use cases, not shared repositories
- Migrations which do not need to move data around should ALWAYS be auto generated. If you see some comments in a migration file which are obviously made by AI or the developer, flag this as an issue!
- Migration files must be in the correct location, never at the project root
- New migration files must always be related to the overall new feature. If something exists in a migration file which is unrelated to the overall feature, flag this as an issue, this was probably a mistake while auto-generating the migration
- Code must be concise and not unnecessary complex. If some code works but can be simplified easily, flag this as an issue!
- If records have relationships to other records, these relationships must be explicit - first the id of the other record, then the relation to the actual record right below that. NEVER relate just to an id without linking the actual other record as well (on the entity level, relationships to ids are fine, this is only about relational integrity in the database). ALWAYS list the id and relation after each other.
