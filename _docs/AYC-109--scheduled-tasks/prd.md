# PRD: Scheduled Tasks (AYC-109)

| | |
|---|---|
| **Ticket** | AYC-109 |
| **Status** | Draft |
| **Owner** | Product |
| **Last updated** | 2026-05-15 |

---

## 1. Problem Statement

Today, every interaction in Ayunis Core is initiated synchronously by a user typing into the chat input. Many recurring information needs (e.g. "every Monday morning, summarize last week's news on topic X using my Marketing knowledge base") have to be re-typed and re-configured by the user every single time. This is repetitive, easy to forget, and produces inconsistent results across runs.

We want users to define a chat prompt **once**, attach all the same context they would attach to a regular chat (model, knowledge bases, anonymize mode, file uploads, internet search, etc.), and have the system run that prompt on a recurring schedule. Each run produces a normal chat thread that the user can open, read, and continue conversing in like any other chat.

This brings Ayunis Core in line with patterns popularised by tools like Claude Code's scheduled tasks, while reusing the existing chat-input mental model so users don't have to learn a new authoring surface.

---

## 2. Goals and Non-Goals

### 2.1 Goals (v1)

- Let a user create, edit, pause, resume, and delete a recurring scheduled task.
- A scheduled task captures the **exact same configuration** as a regular chat input: model, knowledge bases (sources), anonymize mode, file uploads, internet search, agents/skills (whatever is currently exposed in the chat input).
- A scheduled task runs **server-side on schedule**, regardless of whether the user is logged in or has the browser open.
- Each scheduled run produces a **new chat thread** that the user can open and continue chatting in, with the same context inherited.
- Users can find their tasks in a dedicated "Schedule tasks" page (sidebar link below "New chat") and discover completed runs in a "Scheduled" section in the sidebar.
- Users are notified in-app and via email when a run completes (or fails).

### 2.2 Non-Goals (v1)

- Sharing tasks with team members or the org (designed for v2).
- One-off (non-recurring) scheduled tasks.
- Cron expressions or arbitrary intervals — only Hourly / Daily / Weekly / Monthly presets.
- Per-task notification preferences (notifications are global behaviour in v1).
- Per-org or per-plan task limits (no limit in v1).
- Editing a task while a run for it is currently in-flight (we'll accept the simpler "edit waits for next scheduled time" semantic).
- Catch-up / replay of runs missed during system downtime.

---

## 3. Personas

| Persona | Description | Why they care |
|---|---|---|
| **Employee (primary)** | A knowledge worker using Ayunis Core for daily/weekly research and summarisation. | Wants to automate repetitive prompts (weekly market summary, daily compliance check, etc.) without re-typing. |
| **Returning employee** | Same user, hours/days after a run completed. | Wants to find run output, read it, and continue the conversation. |

Org admins and team-sharing personas are explicitly **out of scope** for v1 (see §8).

---

## 4. User Scenarios and Flows

### Scenario 1 — Create a recurring scheduled task

**As an** employee, **I want to** define a chat prompt and have it run every Monday at 09:00, **so that** I get a fresh weekly summary in my inbox without typing it.

#### 4.1.1 Functional requirements

- A new sidebar link **"Schedule tasks"** is rendered directly below "New chat" (gated behind a `scheduledTasksEnabled` feature toggle, off by default until launch).
- Clicking the link routes to `/scheduled-tasks` — the **list** view of the user's scheduled tasks.
- The list view exposes a primary action **"+ New scheduled task"** that opens the **task editor** at `/scheduled-tasks/new`.
- The task editor captures:
  - **Title** (required, ≤ 120 chars) — used as the display name in the list and as the prefix of run-chat titles.
  - **Description** (optional, ≤ 1000 chars) — free-text context shown in the list and on the task detail.
  - **Frequency** (required) — one of:
    - **Hourly**: runs every hour on the hour.
    - **Daily**: user picks time of day (HH:mm in their local TZ).
    - **Weekly**: user picks day of week + time of day.
    - **Monthly**: user picks day of month (1–31; "last day of month" if that day doesn't exist) + time of day.
  - **Timezone**: auto-detected from the browser at creation time and stored on the task. Displayed but not edited in v1.
  - **Chat input block** (the same component used in a regular new chat), which captures:
    - Selected **model**
    - Selected **knowledge bases** / sources
    - **Anonymize mode** toggle
    - **File / image attachments** — stored on the task and re-attached to **every** run.
    - **Internet search** toggle (and any agent/skill selection that is currently part of the chat input).
    - The **prompt body** (the text the user would normally hit "Send" with).
- Saving a task immediately schedules it; the next run is computed from the current time + frequency and shown to the user.
- A newly created task is **enabled** by default.

#### 4.1.2 Non-functional requirements

- **Persistence**: the task and its full configuration (including file uploads) must survive backend restarts.
- **Server-side execution**: runs MUST trigger from a backend scheduler, not from any browser. The user does not need to be online.
- **Performance**: opening the task editor and the list view should match the perceived performance of "New chat" / chat list pages (P95 < 500 ms TTFB).
- **Security**: task config is scoped to the creating user; another user (even in the same org) cannot list, read, edit, or trigger the task in v1.

#### 4.1.3 Acceptance criteria

1. Given the feature toggle is on, when I open the sidebar, then I see a "Schedule tasks" link directly below "New chat".
2. Given I am on the Schedule tasks page with no tasks, when I click "+ New scheduled task", then I land on a form with Title, Description, Frequency, Timezone (read-only), and a chat input identical to the one on the new-chat page.
3. Given I fill in title "Weekly market summary", description, frequency = Weekly / Monday / 09:00, model "GPT-4", knowledge base "Market intel", anonymize ON, internet search ON, and a prompt body, when I click "Create", then the task appears in the list with the configured next-run time displayed in my local TZ.
4. Given I create a task with a file attachment, then re-open the task to edit, the file attachment is preserved on the task and visible.
5. Given I create a task, then the system MUST execute it at the next scheduled instant even if I have logged out and closed the browser.
6. The task title, description, frequency, time, day, model, knowledge bases, files, anonymize mode, and internet search toggles MUST all be persisted and restored exactly as configured.

#### 4.1.4 Dependencies

- Existing chat-input widget (`ayunis-core-frontend/src/widgets/chat-input/`) must be extractable / reusable inside the task editor (not just on the new-chat page).
- A backend scheduler (decision left to architecture: e.g. a recurring job in the existing job runner, or a new module).
- File-storage subsystem must allow files to be referenced by a task entity, not only by a chat message, and re-attached on each run.
- Feature-toggle infrastructure (`scheduledTasksEnabled`).

#### 4.1.5 Assumptions

- The chat input on the editor has parity with the new-chat page; if a feature is unavailable on a regular new chat (e.g. some agents) it is unavailable here too.
- Voice transcription (microphone) is NOT meaningful for a scheduled task; the editor renders the same chat-input component but that's acceptable — the user can still type as normal.

---

### Scenario 2 — View and manage the list of scheduled tasks

**As an** employee, **I want to** see all my scheduled tasks at a glance, including their status and next run, **so that** I can stay in control.

#### 4.2.1 Functional requirements

- `/scheduled-tasks` shows a table/list with columns:
  - Title
  - Frequency (human-readable, e.g. "Weekly · Mon 09:00 (Europe/Berlin)")
  - Status: **Active** / **Paused** / **Failing** (≥ 1 unacknowledged failure on the most recent run)
  - Last run (timestamp + Success/Failed badge), or "—" if never run
  - Next run (timestamp; "—" if Paused)
  - Row actions: **Run now**, **Pause/Resume**, **Edit**, **Delete**
- An empty state is shown when the user has zero tasks, with a primary CTA "+ New scheduled task" and one-paragraph explainer.
- Clicking a row (outside the action buttons) opens the task **detail / edit** page (same form as create).

#### 4.2.2 Acceptance criteria

1. Tasks are sorted by next-run ascending by default; paused tasks fall to the bottom.
2. Pause toggles the task to Paused and clears its next-run; Resume reactivates it and recomputes next-run from "now".
3. Delete removes the task and stops all future runs. Already-completed runs (chats produced by past executions) are **NOT deleted** — they remain accessible like normal chats. This is called out in a confirmation dialog.
4. Edit opens the form with all fields pre-populated; saving stops the in-flight schedule and recomputes next-run from the new config.
5. "Run now" triggers an ad-hoc execution (treated identically to a scheduled run) without affecting the next scheduled time.

#### 4.2.3 Dependencies

- Standard table component, confirmation dialog, status badges from existing UI kit.

---

### Scenario 3 — A run executes and produces a chat

**As an** employee, **I want** each scheduled execution to produce a real chat I can read and reply to, **so that** scheduled output feels native and conversational.

#### 4.3.1 Functional requirements

- When a task fires, the backend creates a new chat thread and posts the configured prompt as the first user message, using the task's saved model, knowledge bases, anonymize setting, attached files, and internet search setting.
- The chat title defaults to **"{Task title} — {YYYY-MM-DD HH:mm}"** in the user's local TZ.
- The chat is owned by the same user that owns the task and is scoped to their org just like any other chat.
- Once the assistant has responded (or the run errored), the system marks the run complete and triggers notifications (Scenario 5).
- A new sidebar group **"Scheduled"** appears below the existing "Chats" group **only if** the user has at least one completed scheduled run. It lists the most recent N (e.g. 10) scheduled-run chats, with a "View all" link going to the task's detail page or a filtered chat list.

#### 4.3.2 Acceptance criteria

1. A scheduled run produces exactly one new chat per execution, even if the user opens the page mid-run.
2. The resulting chat is visible in the regular chat list AND in the new "Scheduled" sidebar group.
3. The chat respects the same access controls as any chat (only the creating user sees it in v1).
4. The first user message in the chat exactly matches the prompt body saved on the task at the time of the run.

---

### Scenario 4 — Continue chatting from a completed run

**As an** employee, **I want to** open a completed scheduled run and reply to it like a normal chat, **so that** I can drill into details without re-configuring anything.

#### 4.4.1 Functional requirements

- Opening a scheduled-run chat shows the standard chat UI.
- The chat input is **pre-populated** with the same context as the run that produced it: model, knowledge bases, anonymize, internet search.
- The user can change any of those settings on the next message just like in a regular chat. Their changes apply only to that chat thread; the parent task config is not modified.
- A small badge at the top of the chat indicates "From scheduled task: {Task title}" and links back to the task detail page.

#### 4.4.2 Acceptance criteria

1. Replying to a scheduled run uses the same model and knowledge bases that produced the original answer unless the user explicitly switches.
2. Changes the user makes inside the chat (e.g. switching model) MUST NOT propagate back to the parent task.
3. Removing/editing the parent task does not delete or alter the scheduled-run chat.

---

### Scenario 5 — Be notified when a run completes

**As an** employee, **I want to** know when a scheduled run has produced output, **so that** I can read it.

#### 4.5.1 Functional requirements

- **In-app**: an unread indicator (dot) on the sidebar "Scheduled" group and on the run's row inside the group; clears when the user opens the chat.
- **Email**: one email per completed run, sent to the user's account email, containing:
  - Task title
  - Run timestamp (user's local TZ)
  - Short snippet of the assistant's first response (e.g. first 500 chars)
  - A deep link back into Ayunis Core that opens the chat
- Failed runs send a separate email with the failure reason (see Scenario 6).
- Notifications are **not configurable per task in v1** — they're sent for every run.

#### 4.5.2 Non-functional requirements

- Email delivery uses the existing transactional-email pipeline.
- Email content respects anonymize mode if it was on for the run (snippet is generated post-anonymisation).

#### 4.5.3 Acceptance criteria

1. Within 60 seconds of a successful run, the user has both an in-app indicator and an email.
2. Opening the run's chat clears the in-app indicator.
3. No duplicate emails are sent for the same run, even after backend retries.

#### 4.5.4 Dependencies

- Existing transactional email service.
- Existing in-app notification / unread-state infrastructure (or a new minimal one if not present — flag for architecture).

---

### Scenario 6 — A run fails

**As an** employee, **I want to** be told when a scheduled run fails (e.g. model unavailable or knowledge base deleted), **so that** I can fix the task.

#### 4.6.1 Functional requirements

- If a run fails (any unhandled error from the chat pipeline, timeout, missing model, deleted knowledge base, etc.), the run is marked **Failed**.
- The task **stays Active** and continues to run on schedule.
- The user is notified in-app (red dot on the task in the list) and by email. The email includes the human-readable failure reason.
- The task list shows status **Failing** when the most recent run failed; it returns to **Active** when a subsequent run succeeds.
- The failed run still produces a chat thread, so the user can see what was attempted; the assistant message is replaced with an error block.

#### 4.6.2 Acceptance criteria

1. If a referenced knowledge base is deleted between runs, the next run fails gracefully and the user is emailed.
2. The task does NOT auto-pause after failure in v1.
3. Status "Failing" persists until the next successful run.

#### 4.6.3 Out of scope (v1)

- Auto-pause after N consecutive failures.
- Per-task failure thresholds.

---

### Scenario 7 — Pause, resume, and delete

**As an** employee, **I want to** temporarily disable a task without losing its config, **so that** I can pause work without re-creating it later.

#### 4.7.1 Functional requirements

- **Pause**: clears next-run, retains config, stops new executions. No effect on already-produced chats.
- **Resume**: recomputes next-run from current time + frequency.
- **Delete**: removes the task and any pending schedule entries. Existing run chats are retained. Confirmation dialog says: "Past run chats will be kept; future runs will stop."

#### 4.7.2 Acceptance criteria

1. Pausing a task that's about to run within the next minute reliably cancels that imminent run.
2. Deleting a task does not delete chats produced by past runs.
3. After delete, the task disappears from the list and no further runs occur.

---

## 5. ASCII UI Mockups

### 5.1 Sidebar — with Schedule tasks link and new "Scheduled" group

```
┌──────────────────────────────────┐
│  AYUNIS CORE                     │
├──────────────────────────────────┤
│                                  │
│   [+] New chat              ⌘J   │
│   [⏰] Schedule tasks       ←NEW │
│   [🤖] Agents                    │
│   [✨] Skills                    │
│   [🧠] Knowledge bases           │
│                                  │
│   ─────────────────────────      │
│   Chats                          │
│   • Marketing brainstorm         │
│   • Q3 planning                  │
│   • Research notes               │
│   ─────────────────────────      │
│   Scheduled                ●NEW  │
│   • Weekly market summary  ●     │
│     2026-05-11 09:00             │
│   • Daily news digest            │
│     2026-05-10 08:00             │
│   • Daily news digest            │
│     2026-05-09 08:00             │
│   < View all in Schedule tasks > │
│                                  │
├──────────────────────────────────┤
│  👤 Account                  ▾   │
└──────────────────────────────────┘
```

Notes:
- The "Scheduled" group only appears once at least one run has completed.
- Filled bullets `●` indicate unread runs.

---

### 5.2 Schedule tasks — empty state

```
┌────────────────────────────────────────────────────────────┐
│  Schedule tasks                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                  ┌──────────────────────┐                  │
│                  │       ⏰              │                  │
│                  └──────────────────────┘                  │
│                                                            │
│         You haven't scheduled any tasks yet.               │
│                                                            │
│  Define a chat prompt once and have Ayunis run it for      │
│  you every hour, day, week, or month.                      │
│                                                            │
│              [ + New scheduled task ]                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 5.3 Schedule tasks — list view

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Schedule tasks                                       [ + New scheduled task ]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Title                  Frequency               Last run     Next run        │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Weekly market summary  Weekly · Mon 09:00      Mon 09:02    Mon (in 6d)     │
│   Active                  Europe/Berlin           ✓ Success                  │
│                                                       [Run now] [⏸] [✎] [🗑] │
│                                                                              │
│  Daily news digest      Daily · 08:00           Today 08:01  Tomorrow 08:00  │
│   Active                  Europe/Berlin           ✓ Success                  │
│                                                       [Run now] [⏸] [✎] [🗑] │
│                                                                              │
│  Compliance scan        Hourly                  10:00        11:00           │
│   Failing                                         ✗ Failed                   │
│                                                       [Run now] [⏸] [✎] [🗑] │
│                                                                              │
│  Quarterly reports      Monthly · day 1, 07:00  May 1 07:01  Jun 1 07:00     │
│   Paused                                          ✓ Success                  │
│                                                       [Run now] [▶] [✎] [🗑] │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Legend: `[⏸] Pause` · `[▶] Resume` · `[✎] Edit` · `[🗑] Delete` · `[Run now]` triggers an ad-hoc run.

---

### 5.4 Task editor — Create / Edit

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Schedule tasks  /  New scheduled task                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Title *                                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Weekly market summary                                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Description                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Pulls last week's news on EU energy markets and summarises top 5 themes│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Frequency *                                                                 │
│  ○ Hourly       ● Weekly       ○ Daily        ○ Monthly                      │
│                                                                              │
│      Day of week:  [ Monday ▾ ]                                              │
│      Time of day:  [ 09:00  ]                                                │
│      Timezone:     Europe/Berlin (your local TZ)                             │
│      Next run:     Mon, 18 May 2026 · 09:00                                  │
│                                                                              │
│  ─── Chat input ──────────────────────────────────────────────────────────   │
│                                                                              │
│  Model:           [ GPT-4o ▾ ]                                               │
│  Knowledge bases: [ Market intel ✕ ]  [ + Add ]                              │
│  ☑ Anonymize mode      ☑ Internet search                                     │
│                                                                              │
│  Attachments:    📎 q1_brief.pdf  ✕      [ + Attach file ]                   │
│                                                                              │
│  Prompt *                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Summarise the most important developments in EU energy markets from   │ │
│  │ the last 7 days. Use the Market intel knowledge base and the web.     │ │
│  │ Output as 5 bullet points with a one-line conclusion.                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│                                                          [ Cancel ]  [ Save ]│
└──────────────────────────────────────────────────────────────────────────────┘
```

State variations:
- **Edit** uses the same screen, populated with current task config; primary action label is "Save changes" and a "Save and run now" secondary action is offered.
- **Validation error** state: inline error under the offending field (e.g. "Title is required", "Pick a time of day").
- **Save in progress**: primary button shows spinner, fields disabled.

---

### 5.5 Run detail — opening a completed run from the sidebar

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Weekly market summary — 2026-05-11 09:00                                    │
│  [ Scheduled task ] ← link to /scheduled-tasks/{id}                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  YOU · 09:00                                                                 │
│   Summarise the most important developments in EU energy markets from        │
│   the last 7 days. (Internet search on, Anonymize on, KB: Market intel)      │
│                                                                              │
│  ASSISTANT · 09:02                                                           │
│   1. <…>                                                                     │
│   2. <…>                                                                     │
│   3. <…>                                                                     │
│                                                                              │
│  ── continue chatting below ──                                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ [GPT-4o ▾]  [📎][KB: Market intel ▾]  [👤 Anon]  [🌐 Search]            │ │
│  │ Type a message…                                                  [Send]│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Failure variant of the same screen:

```
│  ASSISTANT · ERROR                                                           │
│   This run failed: Knowledge base "Market intel" was not found.              │
│   The task is still active; the next run will retry on Mon 18 May 09:00.     │
│   [ Open task settings ]                                                     │
```

---

### 5.6 Delete confirmation

```
┌──────────────────────────────────────────────────┐
│  Delete "Weekly market summary"?                 │
├──────────────────────────────────────────────────┤
│  • Future runs will stop immediately.            │
│  • Past run chats will be kept and remain        │
│    accessible from your chat list.               │
│                                                  │
│                        [ Cancel ]  [ Delete ]    │
└──────────────────────────────────────────────────┘
```

---

### 5.7 High-level navigation map

```
                       ┌──────────────────────┐
                       │   Sidebar: Schedule  │
                       │        tasks         │
                       └──────────┬───────────┘
                                  │ click
                                  ▼
            ┌──────────────────────────────────────────┐
            │ /scheduled-tasks  (list view)            │
            │   • empty state  OR  task table          │
            └──┬─────────────────────────┬─────────────┘
               │                         │
               │ "+ New" / "Edit" row    │ row click (outside actions)
               ▼                         ▼
     ┌────────────────────────┐   ┌───────────────────────────┐
     │ /scheduled-tasks/new   │   │ /scheduled-tasks/{id}     │
     │ /scheduled-tasks/{id}/ │   │ (read-only summary +      │
     │   edit                 │   │  list of recent runs)     │
     └─────────┬──────────────┘   └────────────┬──────────────┘
               │ Save                          │ click run
               ▼                               ▼
     back to /scheduled-tasks         ┌───────────────────────┐
                                      │ /chat/{runChatId}     │ ← also
                                      │ (regular chat UI)     │   reachable from
                                      └───────────────────────┘   sidebar
                                                                  "Scheduled"
                                                                  group
```

---

## 6. Out of Scope (v1)

The following are deliberately deferred:

1. **Sharing tasks across users / org** (planned: v2 — see "Personal by default with optional sharing later").
2. **One-off scheduled tasks** (no run-once-at-a-future-time mode).
3. **Cron expressions / arbitrary intervals** (only the four presets).
4. **Per-task notification preferences**, push notifications, Slack/Teams notifications.
5. **Per-org or plan-based limits** on number of tasks (no limit in v1; ties into AYC-77 usage-based pricing later).
6. **Auto-pause after consecutive failures**.
7. **Catch-up / replay** of runs missed during prolonged backend downtime.
8. **Editing a task while a run is in flight** — edits will not affect the in-flight run; they apply from the next scheduled instant onward.
9. **Concurrent runs of the same task** — if a previous run is somehow still in flight at the next scheduled instant, the new run is **skipped and logged**, not queued.
10. **Voice input on the task editor** (the chat-input component may render the mic button, but voice-driven scheduling is not a goal).
11. **"View all" runs page filtered by task** — for v1 the user navigates to the task detail to see past runs; the "View all" link in the sidebar simply opens `/scheduled-tasks` (list).

---

## 7. Assumptions

- The existing chat-input widget can be reused inside the task editor without major refactor.
- Ayunis Core has (or can easily add) a server-side scheduler that survives restarts and runs jobs at fixed times in arbitrary IANA timezones.
- File attachments can be persisted as references on a task entity and re-attached as inputs on each scheduled run without re-uploading.
- The transactional-email pipeline can accept a new template for "scheduled run completed" / "scheduled run failed".
- An in-app unread/notification mechanism exists or can be added cheaply (architecture phase to confirm).

---

## 8. Risks and Open Questions

| # | Risk / Question | Owner | Notes |
|---|---|---|---|
| R1 | Scheduler reliability during backend downtime — runs missed during downtime are lost. | Architecture | Acceptable for v1; revisit if customers complain. |
| R2 | Email-notification volume could be high for hourly tasks. | Product | We may need batching or a per-task toggle in v2. |
| R3 | File attachments on tasks: storage lifecycle (when does an attachment get deleted? does deleting the task delete its files?). | Architecture | Working assumption: deleting the task deletes its attached files; existing run chats keep their references via a copy-on-run snapshot. To confirm in architecture. |
| R4 | Anonymize mode at run time — depends on the user's org config still allowing anonymize at the moment the run fires. If anonymize is disabled at org level after task creation, behaviour is TBD (most likely: run fails with a clear reason). | Product + Architecture | |
| R5 | "Run now" on a task that's currently in-flight — should it queue, no-op, or refuse? Working assumption: refuse with a toast "A run is already in progress." | Product | |
| R6 | Discoverability of the new "Scheduled" sidebar group — only appears after the first run completes. Some users may wonder where their tasks went between create and first run. | UX | We'll display next-run countdown in the list view to bridge that gap. |
| R7 | Org-level visibility for admins (compliance). Not in v1. May affect data model design. | Architecture | Design entity ownership so future "share with team" doesn't require migration. |

---

## 9. Acceptance — Definition of Done for v1

- [ ] Feature toggle `scheduledTasksEnabled` exists and gates all new UI and endpoints.
- [ ] Sidebar "Schedule tasks" link below "New chat" (gated).
- [ ] `/scheduled-tasks` list view with empty state, table, status badges, row actions.
- [ ] Task editor (create + edit) reusing the chat-input widget.
- [ ] Server-side scheduler executes Hourly / Daily / Weekly / Monthly tasks in the user's stored timezone.
- [ ] Each run produces a real chat owned by the user with the configured prompt and context.
- [ ] Failed runs are recorded, surfaced in the list as "Failing", and produce a chat with an error block.
- [ ] In-app unread indicator on the "Scheduled" sidebar group, clearing on read.
- [ ] Email per run (success and failure) using the existing transactional pipeline.
- [ ] Pause / Resume / Delete / Edit / Run now all behave per acceptance criteria.
- [ ] Task config and run chats survive backend restarts.
- [ ] Files attached to a task are re-used on every run.
- [ ] No way for a user to see, edit, or trigger another user's task in v1.
