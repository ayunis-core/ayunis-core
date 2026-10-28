---
name: appsignal-logs
description: Query Ayunis deployed-environment telemetry in AppSignal — incidents, occurrence counts and error traces via the `appsignal-cli` binary; structured log attributes (user.id, org.id, nestjs.context, custom metadata) via the v2 logs API. Use when investigating a production/staging incident or log data — NOT for local dev logs (see backend-debugging).
---

# AppSignal

Ayunis ships backend logs and errors to AppSignal. There are **two** access paths
and they answer different questions. Pick by the question, don't default to one.

## Pick the tool by the question

| Question | Tool |
| --- | --- |
| Is this incident still happening? How often, first/last seen? | `appsignal-cli` |
| Which exception, what stack trace, which deploy? | `appsignal-cli` |
| What did this log line actually carry — `user.id`, `org.id`, `nestjs.context`, custom metadata? | v2 logs API |

**Incident-shaped ticket questions are answered from incident data, not from
reading code.** "Is this fix realistic?", "how often does this happen?", "is this
still occurring after the last deploy?", "is this already fixed?" — all of these
need `appsignal-cli` before you form an opinion. A full PR was once built and then
closed as a duplicate because an earlier ticket had already suppressed the error in
a deployed revision and nobody checked the live incident first.

## `appsignal-cli`

**The binary is `appsignal-cli`, not `appsignal`.** `command -v appsignal`
returning nothing does not mean the CLI is absent — check `appsignal-cli`.

It is **already authenticated**: the CLI holds its own OAuth token in its config
file (`~/Library/Application Support/appsignal/config.toml` on macOS). Nothing
needs to be fetched from Bitwarden to use the CLI.

```bash
appsignal-cli --help                 # discover the current command surface
appsignal-cli <subcommand> --help    # flags change between versions — check, don't guess
appsignal-cli apps list              # app ids + environments
```

The CLI covers apps, incidents (occurrence counts, first/last seen), error traces,
log search/sources, and deploy markers. Read `--help` rather than guessing flags.

### Always name the environment

Ayunis runs different config and different model deployments per environment.
Before drawing any conclusion, confirm **which app/environment** you queried and
say so in your report. A confident diagnosis built on production data presented as
staging (or vice versa) is worse than no diagnosis — it has happened, and the
whole analysis had to be thrown away.

## The CLI's one blind spot — structured attributes

`appsignal-cli` renders only AppSignal's **legacy `attributes` field**, which
AppSignal is phasing out. Modern structured attributes are emitted under a separate
**`json` field** that the CLI does not display — so the CLI shows `attributes: null`
(or an empty object) even when the line is rich with structured data.

**Consequence:** trusting the CLI for *attribute presence* produces a false-negative
"the logs have no metadata / dotted keys are being dropped" diagnosis. That exact
wrong conclusion has been reached twice. If a logging investigation hinges on "are
attributes present?", query the v2 API — never answer that question from the CLI.

This is a narrow blind spot, not a reason to avoid the CLI for everything else.

## Query the v2 logs API for attributes

Structured attributes live in the `.json` field of each returned line. The request
shape below is the one that currently works — `source_ids` is an **array**, and a
`pagination` object is **required**:

```bash
# TOKEN: the appsignal-cli OAuth token from its config.toml (see above), or an
# AppSignal API token from Bitwarden (search AppSignal). Pass via env; never inline.
curl -sS -X POST 'https://appsignal.com/api/v2/logs/lines' \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
        "from":       "2026-08-06T08:30:00Z",
        "to":         "2026-08-06T08:55:00Z",
        "source_ids": ["<log source id>"],
        "query":      "message:\"Thread deleted successfully\"",
        "pagination":  {"per_page": 100, "order": "ASC", "cursor": {"time": null}}
      }' \
| jq '.[] | {timestamp, message, json}'   # <-- .json holds the real attributes
```

- Auth is the **`Authorization: Bearer` header**. The old `?token=` query parameter
  and the `site_id` / `source_id` / `limit` body fields no longer work.
- The **`.json`** field is where `user.id`, `org.id`, `nestjs.context` and custom
  metadata appear. `.attributes` is the legacy field the CLI reads — expect it empty.
- Get the log `source_id` from `appsignal-cli` (log sources) or the AppSignal UI URL
  for the logs view.
- Scope with `from`/`to` and `query`; set `per_page` explicitly.

If the API rejects a request, check AppSignal's current API docs before
reverse-engineering — the schema has changed at least once.

## Secrets

For the v2 API you can reuse the CLI's own token or fetch the AppSignal API token
from Bitwarden. Per skill conventions, this SKILL.md names the secret; the agent
fetches it (`get-secret`) and exports it before running the curl. Scripts must
never call Bitwarden internally.

## Scope

This skill is for **AppSignal** (deployed environments). For local dev-stack runtime
errors, use the `backend-debugging` skill (`./dev logs backend`) — that is a different
log source and a different workflow.
