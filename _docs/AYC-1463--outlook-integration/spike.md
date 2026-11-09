# Spike: Ground work for the Outlook integration (AYC-1463)

Status: research only, no code changes. Date: 2026-11-02, corrected after an internal code review the same day (resume path, caps, framing, token lifetime) and re-checked against the Microsoft documentation on 2026-11-03 (pinning platforms, mobile limits, admin-center path, attachment formats); client contract (2.1) added on 2026-11-04 after the team presentation; team decision of 2026-11-09 recorded in 2.2 (server-defined `outlook__` tools, work tracked under AYC-1588).

## TL;DR

- **Decision (2026-11-09): tool definitions live on the server, execution in the pane.** The team chose the backend's existing externally handled tool pattern over client-declared tools: `outlook__*` tools are catalog entities without `execute`, the pane runs them through Office.js, and the run context (tools, a short prompt section) is chosen from the client claim in the token. Section 2.2 records what that keeps and drops from 2.1; the work is tracked under AYC-1588.
- **Half of remote tool calling exists; the resume half does not.** A `Tool` without `execute` is "externally handled": the run ends after the tool phase and the client can act on the call. But the run also persists the placeholder `Tool execution is handled externally` as that call's `tool_result`, so the thread no longer has a pending call, and `POST /runs/send-message` with a `tool_result` input is rejected with `No pending tool call`. The chat frontend never posts one: `send_email` and the skill widgets are side effects after the run has finished, and the model only ever sees the placeholder. Resuming a thread with the client's real result is **new behavior**, and it is the first thing to build. The second missing piece is letting a client **declare its own tools per request** instead of picking from the fixed backend catalog.
- **"Usable from the outside" should mean an HTTP contract, not an npm package.** The runtime needs provider credentials, persistence hooks and credit gating, all of which live in the backend. The add-in should talk to the backend's run API, not embed `@ayunis/agent-runtime`. Keep the package workspace-private.
- **Auth is the real blocker, not tools.** The run API is cookie-only (`SameSite=Lax`) and the add-in runs in a cross-site iframe under `outlook.office.com`, so cookies will not be sent. The add-in needs a bearer-token path for the user JWT. Login happens through the Office dialog API against our normal login page; Microsoft Nested App Authentication (NAA, GA since May 2025) is the later upgrade for Microsoft 365 tenants.
- **Outlook's own tools are Office.js calls in the task pane.** Read the open mail (subject, from/to, body, attachments), act on the compose window (set body, add recipients, open reply form). The add-in exposes these to the agent as client-declared tools and executes them locally when the run hands a tool call back.
- **The backend stays client-agnostic.** Nothing in the backend is named after Outlook: generic client tools, a generic origin field and external reference on the thread, token endpoints for any external client, embedding origins as configuration, and a shared client SDK. Section 2.1 lists the rules; tickets 1 to 4 carry them as acceptance criteria.
- **Original recommendation (superseded, see 2.2):** a `client_tools` field on `send-message` plus bearer JWT auth plus `frame-ancestors` for the Outlook hosts. Everything else (manifest, task pane UI, NAA) builds on that.

## 1. What exists today

### 1.1 Agent packages

`packages/` holds a one-way stack: `@ayunis/inference` (message and provider contracts) → `@ayunis/agent-runtime` (the bare loop, hooks are the only extension point) → `@ayunis/agent-extensions` (MCP and skills manifests). All are `private: true`, consumed by the backend through `workspace:*`. The runtime has no framework object, no credentials and no persistence; the backend supplies all of that through hooks (`run-assembly.service.ts` registers credit gate, usage, persistence, tool usage, skill activation, context budget and observability hooks).

### 1.2 The externally handled tool protocol

The runtime tool contract (`packages/agent-runtime/src/contracts/tool.ts`):

> A tool without `execute` is handled externally and ends the loop after the current tool phase has been settled.

`exit-conditions.ts` ends the run when an assistant turn contains at least one execute-less tool **and every call in that turn validates** (`hasExternallyHandledToolCall`); one invalid sibling call keeps the loop going so the model can retry (AYC-675). `tool-executor.ts` returns the placeholder result `Tool execution is handled externally` for the external call and runs the `afterToolCall` hook with it like any other result. The run ends with `run_end` status `completed`, the thread lock is released, and the SSE stream closes.

The backend side (`domain/runs`):

- `runtime-tool-policy.ts` decides which catalog tools are externally handled (`send_email`, `create_calendar_event`, `create_skill`, `edit_skill`, `install_marketplace_skill`). `backend-tool.adapter.ts` maps those to runtime tools without `execute`, keeping only `validateInput`.
- `PersistenceHookFactory.afterToolCall` records `ctx.result` for every call of the turn, including the placeholder for the external one, and flushes the `tool_result` message on the last call or at `runEnd`. After an externally handled run the thread's last message is therefore a `tool_result`, not an open `tool_use`.
- `SendMessageDto.toolResult` (`{ type: 'tool_result', toolId, toolName, result }`) is the continuation input. `ExecuteRunUseCase.persistToolResultSeed` looks up the pending `tool_use` **on the thread's last message only** (`findPendingToolCall`) and throws `No pending tool call to attach this result to` otherwise. Because the placeholder has already been stored, a continuation after a runtime-ended run always hits that error today. `ToolResultCollectorService.handleClientRenderedTool` (give the matching id the client's result, the placeholder to the rest) is reached only when the last message is still a `tool_use`.
- The frontend defines `sendToolResult` in `useMessageSend.ts` but nothing calls it. `SendEmailWidget` opens a `mailto:` link and `CreateSkillWidget` calls the skills API directly; both are side effects after the run has ended, and the model never receives their outcome.

So what exists is "model asks for a tool → run ends → client acts on the stored call". The "client posts the result → model continues" half is designed (DTO, collector, lock and anonymization handling are in place) but is unreachable: the stored placeholder closes the turn before the client can answer. The ticket's "new scenario" is new in two ways: *who* defines the tool, and *that the model receives the result at all*.

### 1.3 Limits of the existing protocol

- **The stored placeholder closes the turn.** See 1.2. Either the external call's placeholder must not be persisted (leave the `tool_use` open until the client answers or the user moves on), or the continuation must replace the stored placeholder. This is the first design decision of the follow-up work; see 3.1.
- **One external call per turn is the practical shape.** `RunToolResultInput` carries one `toolId`/`result`. `collectToolResults` iterates every pending `tool_use` of the last message: backend tools are executed during collection, the external call whose id matches the input gets the client's result, and every other external call in that turn gets the placeholder (`handleClientRenderedTool`). A multi-call turn (read mail + read attachment) needs the DTO to accept an array of results so no call is silently answered with the placeholder. That is a small, contained change.
- **Result size is unbounded on the client path.** The runtime's 200,000-character `MAX_TOOL_RESULT_LENGTH` clamps tools that `execute`, and `limitToolResult` clamps backend tool results in the collector; on anonymous threads backend PII results are cut to 30,000 characters before anonymization. A client-posted `tool_result` goes through `handleClientRenderedTool` unclamped. A mail body or attachment text needs its own limit on the DTO.
- **Tools come only from the backend catalog.** `ToolAssemblyService.buildRunContext` assembles tools from org settings, skills, MCP integrations and artifacts. There is no way for a request to add a tool. `isExternallyHandledTool` is an `instanceof` check against catalog classes.
- **Thread lock is in-process** (`ThreadRunLock`, see AYC-1258). Irrelevant for the externally-handled design because the run ends between calls; it matters only for the "keep the run open" alternative below.

### 1.4 Existing external API surfaces

- `POST /api/openai-compat/v1/chat/completions`: stateless, API-key authenticated (`Authorization: Bearer ayk_live_…`), accepts OpenAI `tools` and `tool_choice` from the client and returns `tool_calls` for the client to execute. This is already "client-declared tools over HTTP", but it is a single inference call, not the agent loop: no thread, no skills, no RAG, no credit hooks per turn, and API keys are **org-scoped, not user-scoped**, so it is the wrong principal for a per-user mailbox assistant.
- `POST /api/runs/send-message`: the full agent loop with threads, SSE streaming and the tool-result continuation. Authenticated by the global JWT guard, which reads the access token **only from the cookie** (`jwt.strategy.ts`), plus `@RequireSubscription()` and `@RequireAcademyCertificate()`.

### 1.5 Browser-embedding constraints in the backend

- `security-headers.middleware.ts` uses helmet defaults, which set `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`. Any page we serve into the Outlook task pane will be refused by the browser until the Outlook host origins are allowed.
- The API's helmet headers only cover pages the API serves. The task pane HTML would be served by the frontend host (`FRONTEND_BASEURL`), so the framing policy has to be set on whichever server serves `/outlook/` (the frontend's static server or the proxy in front of it), not only in `security-headers.middleware.ts`.
- Where the frontend and the API are different origins (local dev: 3001 vs 3000; any split-host deployment), the pane's API calls are cross-origin and `CORS_ALLOWED_ORIGINS` applies; the frontend origin is already allowed there because the web app has the same shape. So framing, CORS and cookies are all involved.
- Session cookies are `httpOnly`, `SameSite=Lax` by default (`authentication.config.ts`, overridable with `COOKIE_SAME_SITE`).

## 2. Bringing the runtime "in a shape that it can be used from the outside"

Three readings of the sentence, with a verdict for each.

| Reading | What it would take | Verdict |
| --- | --- | --- |
| **A. Publish `@ayunis/agent-runtime` to npm and run it in the add-in** | Coordinated publishing of `inference`, `agent-runtime`, providers; shipping provider API keys to the browser or proxying every model call | **No.** Credentials, credit gating, usage accounting, persistence and anonymization are backend hooks. Running the loop in the client would re-implement all of them or bypass them. |
| **B. Run the loop in a separate "Outlook service" that imports the package** | Same as A but server-side; still needs its own persistence, model resolution, credit hooks | **Not now.** The backend already is that host. A second host only makes sense when the loop must run outside the backend process for other reasons (a different deployable, a different tenant model). Keep the packages private; nothing in this ticket needs publishing. |
| **C. Expose the backend's agent loop over an HTTP contract that an external client can drive, including bringing its own tools** | Client-declared tools on `send-message`, a bearer-token auth path, framing headers, and a documented event stream | **Yes.** This is what the iframe actually needs, and most of it already exists for the chat frontend. |

Reading C is also what "outside" will mean for every future embedded surface (Teams, a Word add-in, a partner portal): one run API with client tools and token auth, consumed by several thin clients.

Package-level work that *is* worth doing under reading C is small: the `Tool` contract already distinguishes executable from externally handled tools, and `RunEvent` already carries `tool_call` snapshots with name and input. The one runtime-adjacent change is how the external call's placeholder is persisted (3.1); it can live in the backend's persistence hook, so the package itself can stay unchanged for the first increment.

### 2.1 Client contract

Reading C only stays cheap if every embedded surface uses the same contract, so the rules below are acceptance criteria for tickets 1 to 4, not guidance. They say what the backend may know about a client and what it may not.

- **One contract for every client.** `clientTools`, the tool-result list and the Bearer path are generic fields and endpoints. No backend type, route, use case or configuration key is named after a surface; `outlook` does not appear in the backend.
- **Reserved names, generic rule.** Client tool names use a reserved prefix (proposal: `client_`). The backend rejects collisions with catalog and MCP tool names and knows nothing else about them; the add-in picks `client_outlook_*` on its own.
- **Clients declare, the backend does not remember.** Tools are re-sent on every request. The backend keeps no per-client state between runs, and a thread reopened from a different client sees history whose tools are absent and must still work (a test in ticket 1).
- **Origin is metadata, never behaviour.** One generic field on the thread, `createdVia`, set at creation from a registered client identifier (`web`, `outlook`, later `teams`). It drives display, such as the badge in the web app, and analytics; no use case branches on it.
- **External references instead of client fields.** A thread may carry one `externalReference` (`system`, `id`), unique per user and system, instead of surface-specific columns such as an Outlook item id. Thread-per-mail, per-channel or per-document are all this one field.
- **One principal, two transports.** Cookie and Bearer resolve to the same user. The token-mint and refresh endpoints are "session tokens for an external client"; the token carries the client identifier as a claim so tokens can be scoped and revoked per client.
- **Embedding is configuration.** Allowed framing origins and CORS origins are lists in configuration, one entry per client, not a branch in the security middleware.
- **Rendering is generic.** The web app renders unknown tool calls as plain tool cards, so no client's tools need web-app code.
- **A shared client SDK.** The web app's run client (send, stream, post tool results, hold and refresh the token) becomes a workspace package consumed by the web app and the add-in alike, the way the provider-neutral connect SDK (AYC-1239) is shared today. Every future client starts from it, and the backend contract has one consumer to keep stable.

What stays surface-specific lives only in the client: for Outlook, the manifest, the Office.js implementations of the tools and the quick actions.

### 2.2 Decision after review (2026-11-09)

The team reviewed 2.1 against the backend as it is and chose the other side of the trade-off: control stays on the server. Reasons: the backend already has externally handled tools (`send_email`, `create_calendar_event`: catalog entities without `execute`, the client acts on the stored call), tool-name namespaces already exist (`mcp__`), and every word the model reads about a tool stays server-authored, which keeps admin control and avoids client-supplied prompt text. The cost accepted: a new client or tool is a backend release, and the backend learns a client vocabulary (`outlook__`) and a client-dependent context assembly.

What is adopted (AYC-1588 and its sub-issues):

- **Tools are catalog entities with an `outlook__` prefix** and no `execute`; `isExternallyHandledTool` covers them. The pane holds the Office.js implementation per tool and picks nothing: the backend offers the Outlook tools when the request carries the Outlook client claim.
- **Context by client.** Tool assembly and the system prompt get one short client-dependent section selected from the client claim, placed late in the prompt so the provider cache prefix stays shared with the web app. The claim comes from the token minted by the pane login; it is never read from a header or `Origin`.
- **Mode is still a client fact.** Read versus compose is only visible through Office.js, so the pane reports it with the request or executes a tool that is not applicable as a failed result. First iteration is compose only.

What 2.1 keeps:

- `createdVia` on the thread as metadata, now also the filter for showing or hiding Outlook chats in the web app (AYC-1591 open question).
- One principal, two transports; the client identifier as a token claim; token endpoints for any external client (AYC-1589).
- Framing and CORS origins as configuration lists (now part of AYC-1590, since the backend serves the frontend bundle and helmet's `frame-ancestors 'self'` applies to the pane page).
- The resume rule for externally handled calls (3.1 a): still the first backend task, because `outlook__read_email` and `outlook__read_attachment` need the model to receive the result and continue, unlike today's fire-and-forget widgets.

What 2.1 drops: the `clientTools` request field, the reserved `client_` prefix and its collision rule, the "clients declare, the backend does not remember" rule, and the generic tool-card rendering as a requirement. The shared run client package stays optional; the pane may start from a copy of the web app's send-message code.

Gaps between this spike and the AYC-1588 breakdown are listed in a comment on AYC-1588 (resume rule, SSO through the Office dialog, chat visibility, two tool names to define, origin claim).

## 3. Making remote tool calling possible

### 3.1 Options

**Option 1: Client-declared external tools on the existing continuation protocol (recommended).**

- `send-message` gets an optional `clientTools: ToolSchema[]` (name, description, JSON-schema parameters). The backend validates the schemas, rejects names that collide with catalog tools, and adapts them to runtime tools **without `execute`** (the same shape `backend-tool.adapter.ts` produces for `send_email`).
- When the model calls one, the run ends after the tool phase as it does today. The client receives the `tool_call` in the SSE stream, executes it with Office.js, and posts `tool_result` with the same `clientTools` list (the list is per request, so the continuation run has the same tool set).
- **Resume semantics (the part that does not exist yet).** Two ways to make the continuation attach:
  - *(a) Do not persist the placeholder for external calls.* The persistence hook skips `tool_result` contents for execute-less tools, so the thread's last message stays the assistant `tool_use` and `findPendingToolCall` finds it. The collector then fills the turn on continuation exactly as it is written to do today: backend tools of the same turn are executed during collection, the matching client call gets the real result, the rest get the placeholder. Cost: a thread can end with an open `tool_use`; a following plain user message or a thread reopened in the web app must close it (synthesize the placeholder result at that point) because providers reject a `tool_use` without a `tool_result`. `RuntimeHistoryMaterializer` and the rejected-transcript policy need a test for that state.
  - *(b) Keep persisting the placeholder and let the continuation replace it.* `findPendingToolCall` also looks one message back when the last message is a `tool_result` whose content for that id is the placeholder, and the stored message is updated in place. Cost: a message mutation in a path that is append-only today, and the SSE/telemetry events for the turn were already emitted with the placeholder.
  - Recommendation: (a). It is what the collector was written for, keeps messages append-only, and the "close the open call" rule is one place (seeding the next user input).
- Persistence is otherwise unchanged: the `tool_use` and `tool_result` messages are normal thread messages, so history, anonymization and telemetry keep working.
- Changes: DTO + validator, a `ClientTool` domain object (or reuse `ToolSchema` from `@ayunis/inference`), one branch in `prepareTools`, `RunToolResultInput` accepting an array with a per-result size cap, `isExternallyHandledTool` learning about client tools, and the resume change above. No change to the runtime package.
- Costs: one HTTP round trip and one new run per tool call; multi-step tasks become several short runs. The chat frontend already ends runs on widget calls, so the "run ends on an external call" half is a known operational shape; the resume half is new and needs its own load and failure tests.

**Option 2: Keep the run open and block inside `execute` until the client answers (WebSocket or long-poll).**

- The tool's `execute` awaits a promise resolved by a `POST /runs/:runId/tool-results/:callId`. The agent loop stays alive across tool calls, which gives multi-call turns and `runChild` for free.
- Costs: the SSE stream, the thread lock and the pending promise all live in one process, so a second replica cannot deliver the result (needs Redis pub/sub or sticky routing; AYC-1258 already tracks that the lock is single-instance). Needs a timeout policy for a user who closes Outlook mid-call, and the idle watchdog (`modelCallIdleTimeoutMs`) must not count tool wait time. Mobile and web Outlook may suspend the task pane.
- Verdict: more machinery for a benefit (multi-call turns) that Option 1 can get by accepting an array of results. Revisit only if the end-and-resume shape proves too slow in practice.

**Option 3: The add-in as an MCP server behind a backend relay.**

- `@ayunis/agent-extensions/mcp` can consume a Streamable HTTP MCP server. A browser cannot serve HTTP, so the backend would have to relay requests to the task pane over a WebSocket and present them as an MCP server to the runtime.
- Verdict: Option 2's replica problem plus MCP ceremony for tools that are defined by our own add-in. Not worth it. If a Microsoft-hosted MCP surface for mailbox data appears, it plugs into the existing MCP integration module as a normal server, independent of this work.

### 3.2 Contract sketch for Option 1

Request (multipart form, as today):

```json
{
  "threadId": "…",
  "text": "Summarise this mail and draft a reply",
  "clientTools": [
    { "name": "outlook_get_current_item", "description": "…", "parameters": { "type": "object", "properties": {}, "additionalProperties": false } },
    { "name": "outlook_get_attachment_text", "description": "…", "parameters": { "type": "object", "properties": { "attachmentId": { "type": "string" } }, "required": ["attachmentId"] } },
    { "name": "outlook_set_reply_body", "description": "…", "parameters": { "type": "object", "properties": { "html": { "type": "string" } }, "required": ["html"] } }
  ]
}
```

SSE: unchanged. The client watches the assistant message's `tool_use` contents for names in its own list; the run ends with status `completed`.

Continuation:

```json
{
  "threadId": "…",
  "toolResults": [
    { "toolId": "call_1", "toolName": "outlook_get_current_item", "result": "{\"subject\":\"…\",\"from\":\"…\",\"bodyText\":\"…\"}" }
  ],
  "clientTools": [ "…same list…" ]
}
```

Backend rules worth deciding up front:

- Client tool names must be namespaced (prefix `outlook_` or a reserved `client.` prefix) and must not shadow catalog or MCP tool names; collisions are a 400.
- `clientTools` must be re-sent on every request of a thread, or persisted on the thread for its lifetime. Re-sending is simpler and keeps the thread stateless about the client; persisting makes history replay (`RuntimeHistoryMaterializer`) consistent when the add-in is closed and the thread is reopened in the web app. Start with re-send, and verify in the first increment how the materializer and each provider treat historical `tool_use` entries whose tool is absent from the current request (the web app reopening an Outlook thread is exactly that case).
- On anonymous threads `prepareToolResultInput` already anonymizes the whole posted `tool_result` string, so no new anonymization path is needed. The open choice is whether an Outlook thread is anonymous at all (5), and what size cap applies before anonymization (the backend path uses 30,000 characters).
- Cap `clientTools` (count and schema size) with the same discipline as the inline-file limits on the OpenAI-compat surface.

### 3.3 Why not reuse the OpenAI-compat endpoint

It already accepts client tools, but it is stateless, org-key authenticated and bypasses threads, skills, RAG and per-turn hooks. The Outlook assistant needs a per-user principal, thread history and the org's tools (knowledge bases, MCP integrations), so the run API is the right base.

## 4. How this connects to Outlook

### 4.1 Add-in model and deployment

- An Outlook add-in is a manifest plus HTTPS-hosted web pages. The task pane is an iframe (Outlook on the web, new Outlook on Windows) or an embedded web view (classic Outlook on Windows, Outlook on Mac) that loads our URL and talks to Outlook through Office.js (`https://appsforoffice.microsoft.com/lib/1/hosted/office.js`).
- Two manifest formats exist. The **add-in-only XML manifest** works on every Outlook platform including Mac and mobile. The **unified manifest for Microsoft 365** (JSON, Teams-app style) works on the web, new Outlook on Windows and classic Windows 2307+, but not on Mac or mobile. The ticket's "admin pastes an XML file" matches the XML manifest uploaded through the Microsoft 365 admin center (Settings → Integrated apps → Upload custom apps, app type "Office Add-in"; the older Add-ins → Deploy Add-in portal accepts only the XML manifest, and a unified manifest has to go through Integrated apps as a "Teams app" package). Keep XML for the first version; the unified manifest can be generated from it later if Teams or Copilot packaging is wanted.
- The manifest declares the task pane URL, an `AppDomains` list for any other domain the pane navigates to, the required Mailbox requirement set, and the permission level (`ReadWriteItem` gives the whole item API except `makeEwsRequestAsync`, so it covers reading mail and writing the compose body; `ReadWriteMailbox` adds only EWS, which this design avoids. Exchange Online has turned legacy callback and identity tokens off, so the server-side mailbox path is Microsoft Graph, not EWS).
- Hosting requirement: the task pane page must be served over HTTPS from an origin we control, and that origin must send `Content-Security-Policy: frame-ancestors` (and drop `X-Frame-Options: SAMEORIGIN`) for the Outlook hosts. Microsoft's own Dynamics guidance lists `https://outlook.office.com`, `https://outlook.office365.com` and "your Outlook Web App homepage origin", and an office-js issue confirmed by Microsoft engineering shows both of the first two are needed. The `*.cloud.microsoft` origin appears only in community answers, and one Q&A thread reports that the new Outlook on Windows checks framing against the root of our domain rather than the add-in path; both must be verified against the tenant during the first integration test, not assumed. Our middleware currently forbids framing entirely, so this is a required backend change, ideally only for the add-in route rather than the whole app.

### 4.2 Authentication inside the task pane

Problem statement: our session is a `SameSite=Lax`, `httpOnly` cookie. Inside an iframe whose top-level site is `outlook.office.com`, browsers treat requests from our frame to our API as cross-site, so the cookie is not sent, and third-party cookie blocking makes `SameSite=None` unreliable as well. The add-in therefore needs a token it can hold in memory and send as `Authorization: Bearer`.

Options, in the order they should be built:

1. **Office dialog API + our own login page (first version).** `Office.context.ui.displayDialogAsync` opens our `/login` in a top-level dialog where cookies work normally (password, MFA and the Zitadel SSO flow all run unchanged). After login, a small page issues a short-lived bearer access token and sends it to the task pane with `messageParent`. The backend needs: a JWT strategy that also accepts `Authorization: Bearer <user access token>` (today it reads only the cookie), an endpoint that mints an access token and a refresh token for the current session, and a refresh endpoint the pane can call without cookies (refresh token sent as a Bearer, new token pair returned in the body) so the pane stays signed in for the seven-day refresh lifetime instead of re-opening the dialog every hour. The web app's cookie refresh stays as it is. This reuses every existing auth path and requires nothing from the customer's Entra tenant.
2. **Nested App Authentication (NAA) via MSAL.js (second version, Microsoft 365 tenants).** GA across Office hosts since May 2025 and the path Microsoft recommends; legacy Exchange identity and callback tokens are turned off in Exchange Online, and the Office.js `getAccessToken` SSO is now labelled legacy. NAA gives the add-in an Entra ID token for an API we register, silently, when the user is signed into Office. The backend would validate the Entra token (issuer, audience, `tid`) and map `oid`/`preferred_username` to an Ayunis user. That mapping is the real work: the SSO module keys federated identities on the Zitadel issuer/subject, so either Entra becomes a second accepted issuer or the NAA token is exchanged against Zitadel. It also needs one multi-tenant Entra app registration owned by us and admin consent per customer tenant.
3. **API keys**: not applicable, they identify an organization, not a user.

Recommendation: ship 1, design the strategy interface so 2 can be added without touching the add-in's run client.

### 4.3 Outlook's tools, as seen from the agent

Office.js is callback-based and only runs in the task pane, so every mailbox capability is a client-declared tool executed by the add-in. The first useful set (names illustrative):

| Tool | Office.js basis | Mode | Notes |
| --- | --- | --- | --- |
| `outlook_get_current_item` | `Office.context.mailbox.item` (`subject`, `from`, `to`, `cc`, `dateTimeCreated`, `body.getAsync(Text)`) | read + compose | Body read has no documented hard cap, but strip HTML and apply the runtime's 200,000-character tool-result cap on the client to avoid blowing the context budget. |
| `outlook_list_attachments` | `item.attachments` | read | Returns ids, names, sizes, content types. |
| `outlook_get_attachment_text` | `item.getAttachmentContentAsync(id)` → base64 for files, `.eml`/`.icalendar` text for item attachments, a URL for cloud attachments (Mailbox 1.8, `read item`) | read | Post the bytes to our existing file-retriever path (the OpenAI-compat inline-file limits are a good template: 3 MiB, 50 pages) rather than pushing base64 through the model. Attachments up to 25 MB exist; the tool must refuse above the backend limit. |
| `outlook_set_body` / `outlook_insert_at_cursor` | `item.body.setAsync` / `setSelectedDataAsync` (1 MB cap) | compose | The main "write" action: insert a drafted reply. |
| `outlook_open_reply` | `item.displayReplyFormAsync({ htmlBody })` (Mailbox 1.9) | read | Opens a reply with pre-filled text; the string form is capped at 32 KB, and the method is not supported on iOS or Android. |
| `outlook_add_recipients` | `item.to.addAsync` | compose | |
| `outlook_create_appointment` | `mailbox.displayNewAppointmentFormAsync` (32 KB body cap) | both | Replaces the catalog's `create_calendar_event` widget in this surface. |

Constraints the tool layer must respect (from Microsoft's limits page): at most 3 concurrent async Office.js calls in Outlook on the web and new Outlook, 255-character subject, 1 MB body on write, 25 MB attachment size in web clients. A task pane can be closed by the user at any time, so a tool that was handed to the client and never answered leaves the thread with a pending `tool_use` and no `tool_result`. Today the chat frontend avoids this by always answering widget calls; what the backend does with a plain text message after an unanswered external call is not covered by a test and must be verified (and most likely handled by synthesizing an error result) in the first increment.

### 4.4 What the user sees

Outlook contributes a ribbon button and a side panel (the task pane); everything inside the panel is our page, a slim version of the Ayunis chat with a message list and a text box. Nothing is typed into Outlook's compose window or into Microsoft Copilot. Two UX decisions belong in the first version:

- **Quick actions.** The pane knows which mail is open, so the common requests should not need typing. Buttons above the text box (Summarise, Draft reply, Extract tasks, Translate) each send a prepared prompt with the mail context; free text stays available for everything else. A quick action is only a prompt the pane sends, so it is part of the add-in shell and does not change the backend contract. Whether admins can configure the set, or whether the prompts come from the org's skills, is an open product question.
- **Pinning.** By default the pane closes when the user switches mails. The XML manifest can mark the pane as pinnable (`SupportsPinning`, requirement set 1.5; works in read and compose mode, separately per mode) so it stays open, and the page is told about the new selection through the `ItemChanged` event. Microsoft lists Outlook on the web, new Outlook on Windows, classic Outlook 2016 or later on Windows and Outlook on Mac 16.13 or later as supporting it, for Microsoft 365 subscribers; not Outlook.com and not appointments.

### 4.5 Flow end to end

1. Admin uploads the XML manifest in the Microsoft 365 admin center; users see the Ayunis button in the Outlook ribbon.
2. User opens the task pane; it loads `https://<ayunis>/outlook/` (framing allowed for Outlook hosts), initialises Office.js, finds no token, opens the login dialog, receives a bearer token.
3. Task pane creates or reuses a thread (`POST /threads`), then calls `send-message` with the user's prompt (typed, or produced by a quick action) and its `clientTools`.
4. SSE streams the assistant turn. If a `tool_use` matches a client tool, the run ends with the call left open (ticket 1); the pane executes it via Office.js, posts `tool_result` (+ `clientTools`), and streams the continuation.
5. Backend catalog tools (knowledge bases, MCP integrations, internet search) keep executing server-side in the same runs; the model mixes both.
6. Thread history is visible in the web app like any other thread, with the Outlook tool calls rendered as generic tool cards.

### 4.6 What is deliberately out of scope

- Event-based activation (`OnMessageSend`, `OnNewMessageCompose`): runs in a separate headless runtime with stricter limits; not needed for a task-pane assistant.
- Microsoft 365 Copilot declarative agents and the unified manifest's Copilot extensions: a different product surface with its own runtime; our agent loop would not be the one answering.
- Server-side mailbox access through Microsoft Graph: possible later (reading mail without the pane open) but requires Graph permissions and admin consent; the task pane path covers the user-initiated use cases without it.
- Mobile Outlook: supported by the XML manifest in principle, but the mobile clients stop at Mailbox requirement set 1.5 for most APIs, `displayReplyFormAsync` is not supported there, and the pane UX is a different design problem. A later target. (An earlier draft cited a 16,000-character mobile body limit; that figure is an activation-rule limit for the retired contextual add-ins and does not apply to a task pane.)

## 5. Risks and open questions

- **Framing origins**: the exact set of Outlook host origins (classic `outlook.office.com`/`outlook.office365.com` versus `outlook.cloud.microsoft` for the new clients, plus the Windows WebView2 and Mac WKWebView hosts) is not documented in one place by Microsoft, and the new Outlook on Windows may probe the root of our origin rather than the add-in path, which would make a route-scoped policy insufficient; verify against a real tenant before hardening CSP.
- **Token lifetime in the pane**: access tokens default to one hour (`JWT_EXPIRES_IN`) and refresh tokens to seven days. The pane holds both in memory and refreshes through the Bearer refresh endpoint (ticket 2); the dialog is only needed again when the refresh token expires or is revoked. Whether the pane's refresh token should be shorter-lived than the web app's is a product choice; logout in the web app must invalidate it either way.
- **Thread model**: one thread per mail item, one per Outlook session, or user-chosen? Affects whether `clientTools` are re-sent or persisted and how the web app shows these threads.
- **Unanswered external calls** when the pane is closed (see 4.3).
- **Subscription and academy guards** on `send-message` apply unchanged; the add-in must surface those 403s sensibly.
- **Anonymous threads**: mailbox content is PII-heavy. Decide whether Outlook threads default to the anonymous mode; the posted tool results are already anonymized on anonymous threads, so the remaining work is the size cap and the user-facing explanation.
- **Data residency and consent**: the add-in moves mail content into the org's configured model provider; the manifest description and the org admin's enablement should say so.

## 6. Proposed follow-up tickets

Superseded on 2026-11-09: the work is tracked under AYC-1588 (manifest AYC-1590, login AYC-1589, composing AYC-1591, test tenant AYC-1592). The sub-issues created from this list (AYC-1564 to AYC-1569) are canceled. Of the list below, 1 (resume rule only), 2, 3 (as part of AYC-1590), 5 and 6 are still required; the client-declared half of 1 and the shared package in 4 are dropped (2.2).

1. **Resumable external tool calls and client-declared tools on `send-message`** (backend + OpenAPI client regen). Must state what happens to the placeholder that is stored today before the client answers and how the model then receives the Office.js result: recommended is not persisting the placeholder for external calls and closing an open call when the next plain user input is seeded (3.1 a). Then: `clientTools` DTO and validation, adapter branch, array of tool results with a size cap, `isExternallyHandledTool` for client tools. Tests: a fake client tool whose posted result reaches the next model request verbatim; a thread with an open call receiving a plain message; the same thread reopened through history materialization. Client contract (2.1): generic names and the reserved-prefix rule, no surface-specific types, `createdVia` and `externalReference` on the thread, tools re-sent per request. High-Risk Path (public contract, persistence).
2. **Bearer-token path for the user JWT** (backend): header extractor on the JWT strategy, token-mint endpoint for the dialog flow that returns an access and a refresh token, and a Bearer refresh endpoint that returns a new pair in the body and honours the same revocation and grace rules as the cookie refresh. Tests with two principals and with a revoked refresh token. Client contract (2.1): endpoints named for any external client, the client identifier as a token claim. High-Risk Path (authentication).
3. **Framing policy for the add-in route** (wherever `/outlook/` is served: the frontend's static server or the proxy in front of it, plus `CORS_ALLOWED_ORIGINS` where the API is a separate origin): `frame-ancestors` for Outlook hosts scoped to the add-in page, no `X-Frame-Options` there, verified on a test tenant. Client contract (2.1): origins as per-client configuration lists. High-Risk Path (security headers).
4. **Outlook add-in shell** (frontend or a new small app): first extract the web app's run client into a workspace package (client contract 2.1) and build the pane on it; then manifest, pinnable task pane page, Office.js bootstrap, dialog login, run client, quick actions (Summarise, Draft reply, Extract tasks, Translate), first three tools (`get_current_item`, `set_body`, `open_reply`).
5. **Attachment ingestion for client tools**: reuse the file-retriever limits for base64 attachment content.
6. **NAA / Entra token validation** as the second auth path, after 1 to 4 are in production.
7. **Decision record** for thread model and unanswered-call handling (folded into 1, since the open-call rule is part of its design).

## Sources

- Office Add-ins manifest overview: <https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/manifests>
- Unified manifest client and platform support: <https://learn.microsoft.com/en-us/office/dev/add-ins/develop/unified-manifest-overview>
- Authentication options in Outlook add-ins: <https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/authentication>
- Nested app authentication GA announcement (May 2025): <https://devblogs.microsoft.com/microsoft365dev/nested-app-authentication-now-generally-available-across-microsoft-365/>
- Enable NAA in an add-in: <https://learn.microsoft.com/en-us/office/dev/add-ins/develop/enable-nested-app-authentication-in-your-add-in>
- Limits for activation and API usage in Outlook add-ins: <https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/limits-for-activation-and-javascript-api-for-outlook-add-ins>
- Office dialog API for auth: <https://learn.microsoft.com/en-us/office/dev/add-ins/develop/auth-with-office-dialog-api>
- Outlook add-in permission levels: <https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/understanding-outlook-add-in-permissions>
- Pinnable task panes: <https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane>
- Deploy add-ins in the admin center: <https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-deployment-of-add-ins>
- Browsers and webviews used by add-ins: <https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins>
- `AttachmentContent` formats: <https://learn.microsoft.com/en-us/javascript/api/outlook/office.attachmentcontent>
- Both Outlook origins needed in `frame-ancestors` (office-js issue 5224): <https://github.com/OfficeDev/office-js/issues/5224>
- Dynamics 365 App for Outlook CSP guidance (frame-ancestors hosts): <https://learn.microsoft.com/en-us/power-platform/admin/content-security-policy>
- In-repo: `packages/agent-runtime/README.md`, `packages/agent-runtime/src/contracts/tool.ts`, `packages/agent-runtime/src/engine/exit-conditions.ts`, `ayunis-core-backend/src/domain/runs/application/agent-runtime/backend-tool.adapter.ts`, `ayunis-core-backend/src/domain/runs/application/agent-runtime/runtime-tool-policy.ts`, `ayunis-core-backend/src/domain/runs/presenters/http/dto/send-message.dto.ts`, `ayunis-core-backend/src/domain/openai-compat/SUMMARY.md`, `ayunis-core-backend/src/iam/authentication/application/strategies/jwt.strategy.ts`, `ayunis-core-backend/src/common/middleware/security-headers.middleware.ts`.
