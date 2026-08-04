---
name: appsignal-logs
description: Query Ayunis backend logs in AppSignal to inspect structured attributes (user.id, org.id, nestjs.context, custom metadata). Use when investigating production/staging log data or diagnosing an AppSignal incident — NOT for local dev logs (see backend-debugging).
---

# AppSignal Logs

Ayunis ships backend logs to AppSignal. When you need to inspect what a log line
actually carried in production/staging — structured attributes like `user.id`,
`org.id`, `nestjs.context`, or custom metadata — query AppSignal's **v2 logs API
directly**. Do not rely on `appsignal-cli`.

## The `appsignal-cli` trap — it hides structured attributes

`appsignal-cli` renders only AppSignal's **legacy `attributes` field**, which
AppSignal is phasing out. Modern structured attributes are emitted under a separate
**`json` field** that the CLI does not display — so the CLI shows `attributes: null`
(or an empty object) even when the line is rich with structured data.

**Consequence:** trusting the CLI produces a false-negative "the logs have no
metadata / dotted keys are being dropped" diagnosis. That exact wrong conclusion has
been reached twice from the CLI before the v2 API revealed the attributes were there
all along. If a logging investigation hinges on "are attributes present?", query the
API — never answer from the CLI.

## Query the v2 logs API instead

Structured attributes live in the `.json` field of each returned line:

```bash
# APPSIGNAL_API_TOKEN — a personal/organization API token from Bitwarden
# (search AppSignal). Pass it in via env; never inline the secret.
curl -s -X POST "https://appsignal.com/api/v2/logs/lines?token=${APPSIGNAL_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{
        "site_id":  "<app/site id>",
        "source_id":"<log source id>",
        "query":    "",
        "limit":    100
      }' \
| jq '.[] | {timestamp, message, json}'   # <-- .json holds the real attributes
```

- The **`.json`** field is where `user.id`, `org.id`, `nestjs.context` and custom
  metadata appear. `.attributes` is the legacy field the CLI reads — expect it empty.
- Get `site_id` (the AppSignal app) and `source_id` (the log source) from the AppSignal
  UI URL for the logs view, or from `GET /api/v2/apps` with the same token.
- Adjust `query`/time window to scope the search; `limit` defaults low, so set it.

## Secrets

The API token is a Bitwarden item (AppSignal). Per skill conventions, this SKILL.md
names the secret; the agent fetches it (`get-secret`) and exports it as
`APPSIGNAL_API_TOKEN` before running the curl. Scripts must never call Bitwarden
internally.

## Scope

This skill is for **AppSignal** (deployed environments). For local dev-stack runtime
errors, use the `backend-debugging` skill (`./dev logs backend`) — that is a different
log source and a different workflow.
