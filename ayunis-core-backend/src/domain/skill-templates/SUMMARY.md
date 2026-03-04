# Skill Templates Module

## Purpose

Skill templates are admin-managed blueprints for skills that can be distributed to users. They define the name, instructions, and distribution mode for skills that are automatically installed for users based on the distribution strategy.

## Key Concepts

- **Skill Template**: A blueprint with a name, short description, instructions, distribution mode, and active flag.
- **Distribution Mode**: Controls how templates are distributed to users. Defined in `DistributionMode` enum:
  - `ALWAYS_ON` — the skill is always active for every user and cannot be removed.
  - `PRE_CREATED_COPY` — a personal copy of the skill is pre-created for each user, who can then modify or delete it.
- **Active flag**: Only active templates are eligible for distribution. Inactive templates are drafts or retired.
- **Name uniqueness**: Template names must be globally unique (enforced by DB unique constraint). Duplicate names raise `DuplicateSkillTemplateNameError`.

## Structure

```text
skill-templates/
├── SUMMARY.md
├── domain/
│   ├── skill-template.entity.ts           # Domain entity with name validation
│   └── distribution-mode.enum.ts          # ALWAYS_ON, PRE_CREATED_COPY
├── application/
│   ├── ports/skill-template.repository.ts # Abstract repository interface
│   └── skill-templates.errors.ts          # Domain errors
├── infrastructure/
│   └── persistence/local/
│       ├── schema/skill-template.record.ts        # TypeORM entity
│       ├── mappers/skill-template.mapper.ts       # Domain ↔ Record conversion
│       ├── local-skill-template.repository.ts     # PostgreSQL repository
│       └── local-skill-template-repository.module.ts
└── skill-templates.module.ts              # NestJS wiring
```

## Design Decisions

The module currently exports nothing — there are no use cases or controllers yet. The `SkillTemplateRepository` port is registered internally but not exported. Use cases will be added and exported in subsequent steps, allowing consumers (e.g., the marketplace skill installation flow) to interact with templates.

Name validation reuses the same pattern as the Skills module (Unicode letters, numbers, emojis, hyphens, spaces; no consecutive spaces).

## Dependencies

None — this is a leaf module with no cross-module imports.
