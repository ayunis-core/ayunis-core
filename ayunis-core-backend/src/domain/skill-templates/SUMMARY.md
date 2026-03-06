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
│   ├── skill-templates.errors.ts          # Domain errors
│   ├── listeners/
│   │   └── user-created.listener.ts       # Listens for UserCreatedEvent, installs pre-created templates
│   ├── services/
│   │   └── skill-template-installation.service.ts  # Installs pre-created template copies for a user
│   └── use-cases/
│       ├── create-skill-template/         # CreateSkillTemplateUseCase + command
│       ├── update-skill-template/         # UpdateSkillTemplateUseCase + command
│       ├── delete-skill-template/         # DeleteSkillTemplateUseCase + command
│       ├── find-all-skill-templates/      # FindAllSkillTemplatesUseCase + query
│       ├── find-one-skill-template/       # FindOneSkillTemplateUseCase + query
│       ├── find-active-always-on-templates/   # FindActiveAlwaysOnTemplatesUseCase + query
│       └── find-active-pre-created-templates/ # FindActivePreCreatedTemplatesUseCase + query
├── infrastructure/
│   └── persistence/local/
│       ├── schema/skill-template.record.ts        # TypeORM entity
│       ├── mappers/skill-template.mapper.ts       # Domain ↔ Record conversion
│       ├── local-skill-template.repository.ts     # PostgreSQL repository
│       └── local-skill-template-repository.module.ts
├── presenters/http/
│   ├── super-admin-skill-templates.controller.ts  # CRUD controller (super-admin only)
│   ├── dto/
│   │   ├── create-skill-template.dto.ts           # Create request DTO
│   │   ├── update-skill-template.dto.ts           # Update request DTO
│   │   └── skill-template-response.dto.ts         # Response DTO
│   └── mappers/
│       └── skill-template-response.mapper.ts      # Domain → Response DTO mapper
└── skill-templates.module.ts              # NestJS wiring
```

## Exports

- `FindAllSkillTemplatesUseCase` — exported for consumers that need to list all templates (e.g., marketplace skill installation flow).
- `FindActiveAlwaysOnTemplatesUseCase` — exported for consumers that need always-on templates (e.g., chat module injecting always-on skills).

## Design Decisions

Name validation allows any printable characters (no control characters), 1–100 characters, must not start or end with whitespace, and must not contain consecutive spaces.

## Dependencies

- `iam/authorization` — decorators for route protection (`SystemRoles`)
- `iam/users` — `SystemRole` enum used in controller authorization; `UserCreatedEvent` consumed by listener
- `skills` — `CreateSkillWithUniqueNameUseCase` used by `SkillTemplateInstallationService` to create skill copies with automatic name deduplication
