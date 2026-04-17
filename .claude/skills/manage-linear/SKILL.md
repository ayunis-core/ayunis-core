---
name: manage-linear
description: "Manage Linear issues, projects, cycles, initiatives, and teams via the `linear` CLI (schpet/linear-cli)"
---

# Manage Linear

CLI tool: `linear` (installed via Homebrew). Authenticated and ready to use.

Run `linear --help` or `linear <command> --help` for full option details — don't memorize flags, look them up.

## Important: --sort flag

`linear issue list` **requires** a sort: `--sort priority` or `--sort manual`. Always include it.

## Core commands

### Issues

- **List issues:** `linear issue list --team <KEY> --sort priority [--limit N]`
- **List all states:** add `--all-states` (default: unstarted only)
- **Filter by state:** `--state started`, `--state backlog`, etc.
- **All assignees:** `--all-assignees` (default: your issues only)
- **Create issue:** `linear issue create --team <KEY> --title "..." [--description "..." | --description-file path] [--assignee self] [--priority 1-4] [--label "..."] [--project "..."] [--state "..."]`
- **View issue:** `linear issue view <ID> [--json]`
- **Update issue:** `linear issue update <ID> [--state "..." | --title "..." | --assignee "..." | --priority N | --label "..." | ...]`
- **Delete issue:** `linear issue delete <ID>`
- **Comments:** `linear issue comment add <ID>`, `linear issue comment list <ID>`
- **Relations:** `linear issue relation add <ID> <type> <relatedID>`

### Teams

- **List teams:** `linear team list`
- **Team members:** `linear team members [KEY]`

### Projects

- **List:** `linear project list`
- **View:** `linear project view <ID>`
- **Create/update/delete** — see `linear project --help`

### Cycles, Milestones, Initiatives

- `linear cycle list --team <KEY>`, `linear cycle view <ref>`
- `linear milestone list --project <ID>`, `linear milestone create/update/delete`
- `linear initiative list`, `linear initiative view/create/update/archive`
- `linear project-update create <projectId>`, `linear initiative-update create <initId>`

### Labels & Documents

- `linear label list`, `linear label create`
- `linear document list`, `linear document view <ID>`, `linear document create/update`

### Raw GraphQL

For anything the CLI doesn't cover: `linear api '<query>' [--variable key=value] [--paginate]`

## Ayunis workspace teams

| Key  | Name        |
|------|-------------|
| AYC  | Ayunis Core |
| DEM  | Demo        |
| ENG  | Engineering |
| AYL3 | Locaboo 3   |
| AYL4 | Locaboo 4   |
| MGM  | Management  |
| SAL  | Sales       |

## Project mapping

| Team | Project slug | Use for                     |
|------|--------------|-----------------------------|
| AYC  | AYC          | Ayunis Core development     |

When creating issues for a mapped team, always set `--project <slug>` so issues land in the right project.

## Guidelines

- **Always use `--no-interactive`** on `issue create` when running non-interactively (avoids prompts).
- **Use `--json`** on `issue view` when you need structured data to process.
- **Issue IDs** look like `AYC-4` (team key + number).
- **Ask before creating/updating/deleting** — treat writes with care.
