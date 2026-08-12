---
name: ui-storybook
description: Start, inspect, and stop the @ayunis/ui Storybook for Ayunis Core. Use when reviewing UI package components or stories in a browser.
---

# UI Storybook

Run all commands from the Ayunis Core repository root.

## Start

```bash
./storybook up
```

Storybook starts in a checkout-specific tmux session and is available at `http://localhost:6006`. The command waits until the server is ready.

If port 6006 is occupied, do not stop the process using it. Choose another port:

```bash
STORYBOOK_PORT=6016 ./storybook up
```

Use the same `STORYBOOK_PORT` value for subsequent status, log, and shutdown commands.

## Inspect

```bash
./storybook status
./storybook logs
TAIL=200 ./storybook logs
```

## Stop

```bash
./storybook down
```

Always stop Storybook through this command. It sends Ctrl-C only to the checkout-specific tmux session created by `./storybook up`; never kill a process by PID.

## Validate stories

```bash
cd packages/ui
pnpm typecheck
pnpm lint
pnpm deps:check
pnpm storybook:build
```
