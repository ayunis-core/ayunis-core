# Ayunis Core in Outlook — technical findings (AYC-510)

Status: research + prototype. No product decision taken yet.
Ticket: [AYC-510](https://linear.app/ayunis/issue/AYC-510/outlook-add-in-email-forwarding-and-ai-assisted-reply)
Project: [Core in Microsoft](https://linear.app/ayunis/project/core-in-microsoft-64d823d31d2c)

## 1. What "Outlook integration" actually means technically

There is exactly one supported way to put our own UI inside Outlook: an **Office Web Add-in**.
It is not a plugin in the classic sense — no code is installed on the machine. Outlook reads a
manifest, renders a ribbon button, and loads **our web page** into a pane next to the mail.

The old alternative (COM/VSTO add-ins, DLLs on the Windows machine) is dead for our purposes:
it is Windows-only and is **not supported in the new Outlook on Windows**, which is the client
Microsoft is migrating everyone to.

So the "iframe" assumption is correct, but it is worth being precise about *which* iframe:

- In **Outlook on the web**, Outlook hosts our page in an iframe inside `outlook.office.com`.
- In **Outlook desktop** (Windows new + classic, Mac), Outlook hosts our page in an embedded
  webview control — Edge WebView2 on Windows, WKWebView on Mac — not an iframe.

That distinction is the single most important technical fact in this document, because it
decides how authentication behaves (see section 4).

## 2. The surfaces we can use

| Surface | What it is | Fit for AYC-510 |
| --- | --- | --- |
| Task pane | Vertical pane next to the mail, our HTML | **Primary surface** — this is the chat |
| Add-in command | Ribbon button that opens the pane or runs a function | Entry point |
| Dialog | Separate window/webview opened from the pane | Login, and anything needing more space |
| Event-based activation | Code that runs on events (e.g. on compose) | Later — e.g. "suggest reply" on open |

The task pane can be **pinned**, so it stays open while the user moves between mails. Without
pinning the pane closes on every mail switch, which would make a chat unusable. Pinning requires
Mailbox requirement set 1.5+.

### Reading the mail and writing the reply

Office.js gives us what AYC-510 asks for:

- `Office.context.mailbox.item` — subject, from, to, cc, date, conversation id
- `item.body.getAsync("text" | "html")` — the mail body as context for the chat
- `item.displayReplyFormAsync(...)` / `item.displayReplyAllFormAsync(...)` — open a reply
  pre-filled with our draft, recipients and quoting handled by Outlook
- `item.body.setSelectedDataAsync(...)` — insert into an open compose window at the cursor

`displayReplyFormAsync` is the important one for the acceptance criterion "recipients, subject,
quoting and formatting are preserved" — Outlook builds the reply, we only supply the body.
Nothing is ever sent by us; the user reviews and presses send.

Known caveat: `item.body.getAsync` has documented bugs in Outlook on the web when a mail is part
of a conversation-grouped thread — it can return only part of the body. Worth a spike before we
promise "whole thread as context".

## 3. Can we just iframe the existing Ayunis Core SPA?

Short answer: **not as it stands today**, and the nested-iframe variant is the worst of the
options. Three concrete blockers, all verified against our own code.

### 3.1 We currently forbid being framed

`ayunis-core-backend/src/common/middleware/security-headers.middleware.ts` applies Helmet with
default directives. That sets `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`.
The same backend serves the SPA (`ServeStaticModule` in `app.module.ts`), so the app itself
carries those headers. Outlook would show a blank pane and
`Refused to display … because it set 'X-Frame-Options' to 'SAMEORIGIN'`.

Fix: allow the Outlook host origins explicitly — `https://outlook.office.com`,
`https://outlook.office365.com`, `https://outlook.live.com`, plus the on-prem OWA origin per
customer. `frame-ancestors` must be configurable, not wildcarded.

### 3.2 Our session cookies will not survive Outlook on the web

Auth is cookie-based: `withCredentials: true` in `ayunis-core-frontend/src/shared/api/client.ts`,
and `jwt.strategy.ts` reads the JWT **only** from `req.cookies[access_token]`. Cookie defaults are
`httpOnly: true`, `sameSite: 'lax'` (`common/util/cookie.util.ts`).

In Outlook on the web our page sits in an iframe under `outlook.office.com`, so our cookies are
third-party. `SameSite=Lax` cookies are not sent at all in that context. Setting
`SameSite=None; Secure` fixes the SameSite part but then runs into third-party cookie blocking:
Safari/WKWebView blocks third-party cookies outright, Chromium partitions storage, and Chrome
users can switch them off.

In Outlook **desktop** this problem does not exist in the same way — our page is the top-level
document of the WebView2/WKWebView, so its cookies are first-party.

Conclusion: cookie auth alone can never cover Outlook on the web. We need a token path.

### 3.3 A nested iframe adds a third layer for nothing

"Add-in page that iframes `app.ayunis.com`" means Outlook → our add-in page → our SPA. The SPA is
then two levels deep and still cross-site, so it inherits every cookie problem above *plus* a
second set of framing headers to relax, plus broken focus/keyboard handling and no way to talk to
Office.js from inside.

There is no reason to do this. If we want the SPA in the pane, we point the manifest **directly**
at the SPA URL — one level, and Office.js can be loaded on that page.

## 4. Recommended architecture

A dedicated entry point in the Ayunis Core frontend, served from our own origin, loaded directly
by Outlook. No nested iframe.

1. **A route in the existing SPA**, e.g. `/outlook`, that renders a single chat and loads
   `office.js`. Same origin as the rest of the app, so the whole design system, API client and
   chat feature are reusable. The manifest `SourceLocation` points at
   `https://<tenant>/outlook`.
2. **Auth via the Office Dialog API.** `Office.context.ui.displayDialogAsync` opens a *separate
   browser instance* (not an iframe), which is why identity providers work there and not in the
   pane. The first page in the dialog must be on our own domain (protocol, subdomain and port must
   match exactly). Flow: pane opens dialog → user logs in to Ayunis Core in a first-party context
   → our redirect page calls `messageParent(token)` → pane stores the token.
3. **Bearer token instead of cookies for the pane.** The pane sends `Authorization: Bearer …`.
   This needs a backend change: `jwt.strategy.ts` must accept the `Authorization` header in
   addition to the cookie. There is precedent — `api-key` bearer strategy already exists for the
   OpenAI-compatible endpoints (`domain/openai-compat`), but it is scoped to those routes only.
4. **Token storage**: `localStorage` in the pane. It is partitioned per top-level site since
   Chromium 115, which is fine — the pane consistently gets the same partition. Do not rely on the
   dialog and the pane sharing storage (they do not, in Safari); pass the token via
   `messageParent`.
5. **Backend header + CORS changes**: `frame-ancestors` for the Outlook origins, CORS origin
   allow-list extended with the add-in origin.

The alternative — a fully separate lightweight add-in app that only talks to our API — is more
work and duplicates the chat UI. Only worth it if the SPA turns out to be too heavy for the pane.

## 5. Distribution

- **Development**: sideload. Outlook on the web at `https://aka.ms/olksideload`, or via the
  command line with the Yeoman generator tooling. The add-in must be served over **HTTPS** — the
  local dev cert from `office-addin-dev-certs` is enough.
- **Rollout to a customer**: the M365 admin deploys the manifest centrally (Integrated Apps /
  Microsoft 365 admin center). No Microsoft Marketplace listing required for that, and no
  Microsoft review. Marketplace only matters if we want self-service installation.
- Since the manifest only contains a URL, **updating the add-in = deploying the frontend**. The
  manifest only changes when permissions or entry points change.

## 6. Environment constraints for our customer base

This is where the municipality context bites, and it is the open question from Milestone 1
(surveys PRD-44 / PRD-45 are still open).

| | Exchange Online (M365) | Exchange Server on-prem (2016/2019) |
| --- | --- | --- |
| Add-ins supported | Yes | Yes, Exchange 2016+ |
| Manifest format | XML **or** unified JSON manifest | **XML only** — unified manifest needs M365 |
| Outlook web | Yes | Classic OWA only |
| Outlook mobile | Yes | **Not supported** with on-prem accounts |
| Requirement sets | Newest available | Capped by the server version |
| Extra requirement | — | EWS must be enabled and reachable |

Practical consequence: **build against the XML (add-in only) manifest first**. It is the only
format that covers both worlds. The unified JSON manifest is the strategic direction and is now
GA, but it excludes every on-prem customer, and Microsoft has not announced a deprecation date
for the XML manifest.

Separate deadline worth tracking: Microsoft is retiring EWS in Exchange **Online** — tenants with
`EWSEnabled` unset flip to `False` on 1 October 2026. This does not affect Office.js add-ins
(they use the REST/Graph path), but it does affect any plan that reaches the mailbox from the
backend via EWS.

Non-Microsoft mailboxes (Gmail, Yahoo, IMAP direct) do not support add-ins at all.

## 7. Open questions

- Which environment do our customers actually run — Exchange Online, on-prem, or hybrid?
  Blocks the manifest and requirement-set decision. (PRD-44, PRD-45)
- Single mail vs. whole thread as context — `body.getAsync` is unreliable for grouped
  conversations on the web. Needs a spike.
- Does the mail body go through the anonymisation service before it reaches the model?
- Bearer auth in `jwt.strategy.ts`: scope, expiry, revocation. Needs a security review.
- Do we ship one manifest per tenant (URL is tenant-specific) or one manifest with a
  tenant-selection step in the pane?

## 8. Prototype

See `ayunis-core-outlook-addin/`. It follows section 4: the manifest points Outlook straight at
`/chat?embedded=1` in the existing SPA — same components as in the browser, `AppLayout` just drops
the sidebar via an `embedded` context. The add-in folder holds only the manifest, the icons and an
HTTPS dev proxy that puts app and API on one origin so session cookies stay first-party.

Office.js integration (reading the selected mail, writing the draft reply back) is not wired up
yet — that is the next step once the pane itself is confirmed in Outlook.

## Sources

- [Outlook add-ins overview](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/outlook-add-ins-overview)
- [Browsers and webview controls used by Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/browsers-used-by-office-web-add-ins)
- [Runtimes in Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/runtimes)
- [Use the Office dialog API](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/dialog-api-in-office-add-ins)
- [Authenticate and authorize with the Office dialog API](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/auth-with-office-dialog-api)
- [Develop your Office Add-in to work with ITP when using third-party cookies](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/itp-and-third-party-cookies)
- [Implement a pinnable task pane in an Outlook add-in](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/pinnable-taskpane)
- [Get or set the body of a message or appointment in Outlook](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/insert-data-in-the-body)
- [Sideload Outlook add-ins for testing](https://learn.microsoft.com/en-us/office/dev/add-ins/outlook/sideload-outlook-add-ins-for-testing)
- [Add-ins for Outlook in Exchange Server](https://learn.microsoft.com/en-us/exchange/add-ins-for-outlook-2013-help)
- [Office Add-ins with the unified app manifest for Microsoft 365](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/unified-manifest-overview)
- [office-js#5224 — X-Frame-Options SAMEORIGIN in a task pane](https://github.com/OfficeDev/office-js/issues/5224)
- [office-js#2317 — body.getAsync with conversation-grouped mails](https://github.com/OfficeDev/office-js/issues/2317)
