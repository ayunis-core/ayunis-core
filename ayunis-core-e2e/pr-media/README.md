# PR media capture

This directory contains stable infrastructure for temporary PR screenshots and short GIF demos.

Scene definitions do **not** live in product branches. For PR `<n>`, write the scene file to the disposable branch `pr-media/pr-<n>` at `.pr-media/scenes.ts`. The App Integration workflow fetches that file, runs these capture helpers with a read-only token, publishes generated media back to the same `pr-media/pr-<n>` branch, and deletes the branch when the PR closes.

Use `scripts/update-scenes.sh --pr <n> <scenes.ts>` after a PR exists to create or update the temporary scene branch and re-run the latest App Integration workflow for that PR branch when available.
