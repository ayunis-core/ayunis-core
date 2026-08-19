---
name: pr-media
description: Create temporary PR-specific screenshots and short GIF demos without committing scene code to the product branch. Use when the user asks for PR screenshots/videos/demos/media, and after visible frontend changes unless explicitly opted out.
---

# PR Media

PR media scenes are temporary review aids. Never commit scene definitions to the product PR. Store them on the disposable `pr-media/pr-<number>` branch; the e2e workflow deletes that branch when the PR closes.

For visible frontend changes, PR media is required after the product PR is created or updated unless the user explicitly says not to add PR media. Minimum coverage is a desktop screenshot and a mobile screenshot of the changed UI. Add a short GIF when the change affects an interaction, dialog, menu, transition, or multi-step flow.

## Workflow

1. Ensure the product PR exists and the current branch is its head:

   ```bash
   gh pr view --json number,url,headRefName
   ```

2. Decide the smallest scene set that shows the changed UI. Do not auto-detect routes or capture unrelated pages. Write a temporary scene file outside the repo, e.g. `/tmp/pr-media-scenes.ts`.

3. Upload it to the media branch:

   ```bash
   scripts/pr-media/update-scenes.sh --pr <number> /tmp/pr-media-scenes.ts
   ```

4. Re-run or wait for the e2e workflow. It will fetch `.pr-media/scenes.ts` from `pr-media/pr-<number>`, capture media with read-only permissions, then publish generated PNG/GIF files back to the same branch and upsert the sticky PR comment.

## Scene file shape

```ts
import type { PrMediaScene } from './types';

export default [
  {
    name: 'admin-users-invite',
    path: '/admin-settings/users',
    viewports: ['desktop', 'mobile'],
    waitFor: async ({ page }) => page.getByTestId('settings-sidebar'),
    demos: [
      {
        name: 'invite-dialog',
        action: async ({ page }) => {
          await page.getByRole('button').last().click();
        },
      },
    ],
  },
] satisfies PrMediaScene[];
```

Guidelines:

- Keep scene and demo names kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`); CI rejects unsafe names before publishing. Output is `scene-name--viewport.png` and `scene-name--demo-name--viewport.gif`.
- Use `getByTestId` / `getByRole`; avoid text selectors where possible because the UI is localized.
- Prefer short, deterministic interactions. No `waitForTimeout`; wait on locators or assertions.
- Include only scenes the reviewer asked for.

## Verify

```bash
gh api repos/$GITHUB_REPOSITORY/git/ref/heads/pr-media/pr-<number>
gh pr checks <number> --watch --interval 30
```

Confirm the sticky `<!-- pr-screenshots -->` comment contains the expected PNG/GIF names.
