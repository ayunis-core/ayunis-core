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
- **Other people's issues (was `--all-assignees` on `issue list`):** the flag was removed from `issue list` and moved to a separate `issue query` subcommand:

  ```bash
  linear issue query --team <KEY> --all-assignees --all-states --sort manual
  ```

  Running `linear issue list --all-assignees` now errors out with: `--all-assignees has been removed from 'issue mine'. Use 'linear issue query --all-assignees' for assignee filtering`.
- **Create issue:** `linear issue create --team <KEY> --title "..." [--description "..." | --description-file path] [--assignee self] [--priority 1-4] [--label "..."] [--project "..."] [--state "..."]`
- **View issue:** `linear issue view <ID> [--json]`
- **Update issue:** `linear issue update <ID> [--state "..." | --title "..." | --assignee "..." | --priority N | --label "..." | ...]`
- **Delete issue:** `linear issue delete <ID>`
- **Comments:** `linear issue comment add <ID>`, `linear issue comment list <ID>`
- **Relations:** `linear issue relation add <ID> <type> <relatedID>`

### Gotchas

- **`--project` on `issue create` rejects UUIDs.** Pass the project name or slug:

  ```bash
  linear issue create --team AYC --project "Workspaces" --title "..."   # works
  linear issue create --team AYC --project fb01ed91-... --title "..."   # → "Project not found"
  ```

  UUIDs *do* work on `project view` / `project update`, just not on `issue create`. Look up the slug via `linear project list --json` when uncertain.
- **`linear issue view` does not list sub-issues.** To enumerate children of a parent, use the raw GraphQL fallback:

  ```bash
  linear api 'query($id: String!){ issue(id:$id){ children{ nodes{ identifier title state{ name } } } } }' \
    --variable id=<PARENT_ID>
  ```

- **Newly created issues may not be queryable immediately.** If `linear issue view <ID>` right after `issue create` fails with "Could not find referenced Issue", wait a second and retry — trust the URL printed by `create`.

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

### Per-team state names

State names are NOT uniform across teams. **Do not hardcode `"In Progress"` or
`"Done"`** — look up the team's actual state before updating. Confirmed
divergences:

| Team | Started state    | Closed state |
|------|------------------|--------------|
| AYC  | `In Development` | `Done`       |

(Other teams default to the standard `In Progress` / `Done` until a divergence is
observed and added here.)

To enumerate any team's states yourself:

```bash
linear api 'query($key: String!){ team(id: $key){ states { nodes { name type } } } }' \
  --variable key=<TEAM_KEY>
```

## Guidelines

- **Always use `--no-interactive`** on `issue create` when running non-interactively (avoids prompts).
- **Use `--json`** on `issue view` when you need structured data to process.
- **Issue IDs** look like `AYC-4` (team key + number).
- **Ask before creating/updating/deleting** — treat writes with care.
- **Subtasks** should always be created with `--state Backlog`, not `Triage` — the parent has already been triaged.
- **Create sub-issues upfront when a ticket enumerates iterations.** If the parent ticket spells out "iter 1 / iter 2 / iter 3" or numbered phases, propose creating one sub-issue per iteration during planning, *before* implementation starts. Update each sub-issue's state as work progresses (`In Progress` → `Done`) rather than reconstructing the mapping after the fact.
