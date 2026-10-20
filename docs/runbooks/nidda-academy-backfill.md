# Stadt Nidda Academy backfill (AYC-1180)

Record prior Academy completion for Stadt Nidda accounts that existed when
[Stefan confirmed all existing users had completed training](https://linear.app/ayunis/issue/AYC-1180/previously-certified-academy-users-lose-chat-access-after-enabling#comment-f807d9ab).
Later users must complete the Academy themselves.

- Organization: `64dc46da-a9b8-4510-b666-1c0c9b6d9517`.
- Inclusive account creation cutoff: `2026-10-07T12:09:09.646Z`.
- Administrative completion date: `2026-10-07T00:00:00Z`, selected for this repair;
  it is not evidence of the actual training date. Core displays it as the last
  completion date and prints it on downloaded participation confirmations.
- Existing completion records, including their dates, are preserved.
- No chapter confirmations, video timers, credit limits or org settings change.

## Classification and failure modes

High-Risk Path: grants access through a persistent completion record. This is an
operator-run data repair, not a schema migration or an automatic startup task.

| Setup / transition | Expected outcome | Evidence |
| --- | --- | --- |
| Nidda user created at/before cutoff, no completion | One completion at the administrative date | PostgreSQL regression test; operator preview |
| User created after cutoff or in another org | No completion added; remains gated | Distinct-user regression checks |
| Existing completion, empty eligible set, repeat execution | Existing rows unchanged; repeat inserts zero | PostgreSQL regression tests |
| Preview or SQL failure before commit | All writes rolled back | PostgreSQL preview test; `ON_ERROR_STOP` |
| Delete account, recreate after cutoff, rerun | Recreated account remains uncertified | PostgreSQL lifecycle regression test |

Ownership: operator SQL → `academy_completion` → Academy completion query →
Academy access evaluation and guard → chat writes, progress and certificate PDF.
Users owns the account org and creation timestamp. Account org membership is not
editable through the current user update API. UI and transport contracts are
unchanged. No cache or external provider participates; refresh browser data after
execution. No secrets are written.

## Preview

Run from the repository root with `psql` and a securely supplied `DATABASE_URL`
for the intended environment. Verify the database identity and organization name
before continuing. Do not put credentials in the command or ticket.

```sh
psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=on \
  --command='SELECT current_database(), inet_server_addr(), inet_server_port();' \
  --command="SELECT id, name FROM orgs WHERE id = '64dc46da-a9b8-4510-b666-1c0c9b6d9517';"

psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=on \
  --command='BEGIN; SET LOCAL lock_timeout = '\''5s'\''; SET LOCAL statement_timeout = '\''60s'\'';' \
  --file=ayunis-core-backend/src/db/scripts/backfill-nidda-academy.sql \
  --command=ROLLBACK
```

The preview returns only newly inserted completion IDs, user IDs and dates, then
rolls them back. Retain this roster and its count in the operational change record.
Confirm the target organization is Stadt Nidda and the roster contains only the
cohort covered by the ticket. Stop if the organization is missing or the roster
is unexpected. No name or email data needs to be posted to the ticket.

## Apply and verify

After reviewing the preview, run the same command with a commit:

```sh
psql "$DATABASE_URL" -X --set=ON_ERROR_STOP=on \
  --command='BEGIN; SET LOCAL lock_timeout = '\''5s'\''; SET LOCAL statement_timeout = '\''60s'\'';' \
  --file=ayunis-core-backend/src/db/scripts/backfill-nidda-academy.sql \
  --command=COMMIT
```

Retain the returned completion IDs as the exact change manifest. An error closes
the connection before commit and PostgreSQL rolls the transaction back. The
unique user constraint also preserves a completion earned concurrently.

With the Academy add-on active and the org set to `required_once`, use independent
eligible and post-cutoff user sessions: verify both are denied before execution,
apply, then verify only the eligible user can start/send chat. Check the admin
overview shows its completion date, account progress and certificate download.
If support temporarily selected `unrestricted`, the org admin must restore
`required_once` after validating the repair; this script does not change that mode.
Rerun the preview to confirm zero new rows. Record the environment, commands,
insert count and observed access results on AYC-1180. Code merge alone does not
mean the production repair has run.

After commit, do not broadly delete completions by date to undo the operation.
Any reversal must use the saved manifest and first verify those records have not
been refreshed by subsequent training.

## Development validation

`pnpm test backfill-nidda-academy --runInBand` in `ayunis-core-backend` exercises
the exact SQL against transaction-scoped temporary PostgreSQL tables. Supply
local `POSTGRES_*` connection settings as with the other database integration
tests. It does not modify application tables.
