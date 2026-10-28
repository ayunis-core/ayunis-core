#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createSlotsHandler as createApiHandler } from "./dev-slots-api.mjs";
import { discoverSlotsWithRemoval } from "./dev-slots-worktree.mjs";

export async function disableDuring(button, action) {
  button.disabled = true;
  try {
    return await action();
  } catch (error) {
    button.disabled = false;
    throw error;
  }
}

export function updateNotice(notice, message, isError = false) {
  notice.textContent = message;
  notice.style.color = isError ? "#ff9aa8" : "";
}

export function selectableSlots(slot, availableSlots) {
  const alternatives = availableSlots.filter((choice) => choice !== slot.slot);
  return slot.startAllowed ? [slot.slot, ...alternatives] : alternatives;
}

export function startActionLabel(currentSlot, targetSlot) {
  return currentSlot === targetSlot ? "Start" : "Reassign & start";
}

function page(token) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ayunis Dev Slots</title>
  <script>
    try {
      const savedTheme = localStorage.getItem('dev-slots-theme');
      const preferredTheme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.dataset.theme = savedTheme ?? preferredTheme;
    } catch { document.documentElement.dataset.theme = 'dark'; }
  </script>
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      --background: #0b0d10;
      --glow: #1b2634;
      --text: #f3f5f7;
      --muted: #9ca6b3;
      --branch: #b9c3cf;
      --surface: rgba(19, 23, 29, .88);
      --surface-solid: #101419;
      --subtle-surface: #0c0f13;
      --border: #2a3039;
      --divider: #353b44;
      --secondary: #252b33;
      --secondary-hover: #303842;
      --secondary-text: #d9e0e7;
      --primary: #edf2f7;
      --primary-hover: #fff;
      --primary-text: #11151a;
      --path-text: #9faab6;
      --pre-text: #c7d2df;
      --success: #91d9b3;
      --warning-surface: #2e2115;
      --warning-text: #ffc279;
      background: var(--background);
      color: var(--text);
    }
    :root[data-theme="light"] {
      color-scheme: light;
      --background: #f4f6f8;
      --glow: #dbe9f5;
      --text: #17202a;
      --muted: #66717e;
      --branch: #4f5c69;
      --surface: rgba(255, 255, 255, .9);
      --surface-solid: #fff;
      --subtle-surface: #f6f8fa;
      --border: #d8dee5;
      --divider: #d5dbe2;
      --secondary: #e8edf2;
      --secondary-hover: #dce3e9;
      --secondary-text: #26323e;
      --primary: #17202a;
      --primary-hover: #293746;
      --primary-text: #fff;
      --path-text: #566370;
      --pre-text: #33404d;
      --success: #24734a;
      --warning-surface: #fff1da;
      --warning-text: #8b4a08;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 15% 0%, var(--glow) 0, transparent 40%), var(--background); color: var(--text); }
    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 56px 0 80px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-bottom: 32px; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: -.055em; line-height: .95; }
    header p { margin: 12px 0 0; color: var(--muted); }
    button, .link { border: 0; border-radius: 10px; padding: 10px 14px; font: inherit; font-weight: 650; cursor: pointer; text-decoration: none; }
    button { background: var(--primary); color: var(--primary-text); }
    button:hover { background: var(--primary-hover); }
    button:disabled { cursor: not-allowed; opacity: .45; }
    select { border: 1px solid var(--border); border-radius: 9px; padding: 9px 10px; background: var(--subtle-surface); color: var(--text); font: inherit; }
    .mode { display: grid; gap: 4px; color: var(--muted); font-size: .75rem; font-weight: 700; }
    .grid { display: grid; gap: 16px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; box-shadow: 0 14px 40px rgba(0,0,0,.1); }
    .card-head, .actions, .meta { display: flex; align-items: center; gap: 10px; }
    .card-head { justify-content: space-between; align-items: start; }
    h2 { margin: 0; font-size: 1.25rem; letter-spacing: -.02em; }
    .branch { margin-top: 5px; color: var(--branch); overflow-wrap: anywhere; }
    .badge { border-radius: 999px; padding: 5px 9px; font-size: .76rem; font-weight: 750; text-transform: uppercase; letter-spacing: .06em; background: #26303b; color: #cbd5df; }
    .running { background: #143b2b; color: #7ce2ad; }
    .attention { background: #482c13; color: #ffc279; }
    .stopped { background: #292e35; color: #adb6c0; }
    .conflict { background: #4d1f27; color: #ff9aa8; }
    .meta { margin: 18px 0; flex-wrap: wrap; color: var(--muted); font-size: .9rem; }
    .meta span { border-right: 1px solid var(--divider); padding-right: 10px; }
    .meta span:last-child { border: 0; }
    .path { padding: 11px 12px; background: var(--subtle-surface); border: 1px solid var(--border); border-radius: 9px; color: var(--path-text); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .79rem; overflow-wrap: anywhere; }
    .warning { margin-bottom: 12px; padding: 10px 12px; border-radius: 9px; background: var(--warning-surface); color: var(--warning-text); font-size: .86rem; }
    .diagnostics { margin-bottom: 12px; overflow: hidden; border: 1px solid var(--border); border-radius: 10px; background: var(--subtle-surface); }
    .diagnostics summary { padding: 11px 12px; cursor: pointer; font-weight: 700; }
    .process { display: grid; gap: 9px; padding: 14px 12px; border-top: 1px solid var(--border); }
    .process-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .process-command { color: var(--pre-text); font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
    .process-owner, .recommendation { color: var(--muted); font-size: .84rem; overflow-wrap: anywhere; }
    .recommendation { color: var(--text); }
    .owner-active-worktree { background: #143b2b; color: #7ce2ad; }
    .owner-orphan { background: #4d1f27; color: #ff9aa8; }
    .actions { margin-top: 16px; justify-content: flex-end; flex-wrap: wrap; }
    .secondary { background: var(--secondary); color: var(--secondary-text); }
    .secondary:hover { background: var(--secondary-hover); }
    .danger { background: #56232b; color: #ffc7cf; }
    .danger:hover { background: #6c2934; }
    .empty, .error { padding: 56px 24px; text-align: center; color: var(--muted); }
    dialog { width: min(850px, calc(100% - 32px)); border: 1px solid var(--border); border-radius: 16px; background: var(--surface-solid); color: var(--text); padding: 0; }
    dialog::backdrop { background: rgba(0,0,0,.7); backdrop-filter: blur(4px); }
    .dialog-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    pre { margin: 0; padding: 18px; max-height: 65vh; overflow: auto; color: var(--pre-text); font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
    #notice { min-height: 24px; margin: 0 0 14px; color: var(--success); }
    @media (max-width: 760px) { header { align-items: start; flex-direction: column; } .card-head { gap: 14px; } }
  </style>
</head>
<body>
  <main>
    <header><div><h1>Dev slots</h1><p>Every checkout, one calm control surface.</p></div><div class="actions"><label class="mode">Run mode<select id="mode"><option value="standard">Standard</option><option value="e2e">E2E mocks</option><option value="anonymisation">With anonymisation</option></select></label><button class="danger" id="stop-all">Stop all safely</button><button class="secondary" id="theme">Light mode</button><button id="refresh">Refresh</button></div></header>
    <p id="notice" role="status"></p>
    <section id="slots" class="grid" aria-live="polite"><div class="card empty">Inspecting worktrees…</div></section>
  </main>
  <dialog id="logs"><div class="dialog-head"><strong>Slot logs</strong><button class="secondary" id="close-logs">Close</button></div><pre></pre></dialog>
  <script>
    const token = ${JSON.stringify(token)};
    const slotsElement = document.querySelector('#slots');
    const notice = document.querySelector('#notice');
    const logsDialog = document.querySelector('#logs');
    const stopAllButton = document.querySelector('#stop-all');
    const themeButton = document.querySelector('#theme');
    const disableDuring = ${disableDuring.toString()};
    const updateNotice = ${updateNotice.toString()};
    const selectableSlots = ${selectableSlots.toString()};
    const startActionLabel = ${startActionLabel.toString()};
    let availableSlots = [];
    let slots = [];
    const setText = (element, value) => { element.textContent = value; return element; };
    const make = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) element.textContent = text;
      return element;
    };
    function diagnosticPanel(diagnostics) {
      const details = make('details', 'diagnostics');
      const noun = diagnostics.length === 1 ? 'listener' : 'listeners';
      details.append(make('summary', '', diagnostics.length + ' unmanaged ' + noun));
      for (const diagnostic of diagnostics) {
        const process = make('div', 'process');
        const head = make('div', 'process-head');
        head.append(
          make('strong', '', diagnostic.service + ' · port ' + diagnostic.port),
          make('span', 'badge owner-' + diagnostic.owner.kind, diagnostic.owner.label),
        );
        const owner = diagnostic.owner.branch
          ? 'Owner: ' + diagnostic.owner.branch + ' · ' + diagnostic.owner.worktree
          : 'Working directory: ' + diagnostic.cwd;
        process.append(
          head,
          make('div', 'process-owner', 'PID ' + diagnostic.pid + ' · ' + owner),
          make('div', 'process-command', diagnostic.command),
          make('div', 'recommendation', diagnostic.recommendation),
        );
        details.append(process);
      }
      return details;
    }
    function card(slot) {
      const article = make('article', 'card');
      const head = make('div', 'card-head');
      const title = make('div');
      title.append(make('h2', '', 'Slot ' + slot.slot), make('div', 'branch', slot.branch));
      const badges = make('div', 'actions');
      badges.append(make('span', 'badge ' + slot.summary, slot.summary));
      if (slot.conflict) badges.append(make('span', 'badge conflict', 'conflict'));
      head.append(title, badges);
      const meta = make('div', 'meta');
      meta.append(
        make('span', '', 'Frontend :' + slot.ports.frontend),
        make('span', '', 'Backend :' + slot.ports.backend),
        make('span', '', slot.dirty ? 'Dirty worktree' : 'Clean worktree'),
      );
      const actions = make('div', 'actions');
      if (slot.frontendRunning) {
        const open = make('a', 'link secondary', 'Open app');
        open.href = 'http://localhost:' + slot.ports.frontend;
        open.target = '_blank';
        actions.append(open);
      }
      const logButton = make('button', 'secondary', 'Logs');
      logButton.onclick = () => showLogs(slot).catch(showError);
      if (slot.startAllowed || slot.reassignAllowed) {
        const slotSelect = make('select', 'slot-select');
        slotSelect.setAttribute('aria-label', 'Slot for ' + slot.branch);
        const choices = selectableSlots(slot, availableSlots);
        for (const choice of choices) {
          const option = make('option', '', 'Slot ' + choice);
          option.value = choice;
          slotSelect.append(option);
        }
        if (!choices.length) {
          const option = make('option', '', 'No free slots');
          option.value = '';
          slotSelect.append(option);
          slotSelect.disabled = true;
        }
        const startButton = make('button', '', startActionLabel(slot.slot, Number(slotSelect.value)));
        startButton.disabled = !choices.length;
        slotSelect.onchange = () => { startButton.textContent = startActionLabel(slot.slot, Number(slotSelect.value)); };
        startButton.onclick = () => start(slot, slotSelect, startButton).catch(showError);
        actions.append(slotSelect, startButton);
      }
      if (slot.restartAllowed) {
        const restartButton = make('button', '', 'Restart');
        restartButton.onclick = () => restart(slot, restartButton).catch(showError);
        actions.append(restartButton);
      }
      if (slot.releaseAllowed) {
        const releaseButton = make('button', 'secondary', 'Release claim');
        releaseButton.onclick = () => releaseClaim(slot, releaseButton).catch(showError);
        actions.append(releaseButton);
      }
      if (slot.deleteDataAllowed) {
        const deleteButton = make('button', 'danger', 'Delete slot data');
        deleteButton.onclick = () => deleteData(slot, deleteButton).catch(showError);
        actions.append(deleteButton);
      }
      if (!slot.removalProtection) {
        const removeButton = make('button', 'danger', 'Remove worktree');
        removeButton.disabled = !slot.removeWorktreeAllowed;
        removeButton.title = slot.removeWorktreeBlockedReason ?? '';
        removeButton.onclick = () => removeWorktree(slot, removeButton).catch(showError);
        actions.append(removeButton);
      }
      const stopButton = make('button', 'danger', 'Stop safely');
      stopButton.disabled = !slot.stopAllowed;
      stopButton.title = slot.stopBlockedReason ?? (!slot.stopAllowed ? 'No safely stoppable managed services were detected.' : '');
      stopButton.onclick = () => stop(slot, stopButton).catch(showError);
      actions.append(logButton, stopButton);
      article.append(head, meta);
      if (slot.stopBlockedReason) article.append(make('div', 'warning', slot.stopBlockedReason));
      if (slot.diagnostics?.length) article.append(diagnosticPanel(slot.diagnostics));
      article.append(make('div', 'path', slot.worktree), actions);
      return article;
    }
    async function load({ clearNotice = true } = {}) {
      if (clearNotice) updateNotice(notice, '');
      const response = await fetch('/api/slots', { cache: 'no-store', headers: { 'x-dev-slots-token': token } });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      slots = result.slots;
      availableSlots = result.availableSlots;
      stopAllButton.disabled = !slots.some((slot) => slot.stopAllowed);
      slotsElement.replaceChildren(...(slots.length ? slots.map(card) : [make('div', 'card empty', 'No worktree has selected a slot yet.') ]));
    }
    async function stop(slot, button) {
      if (!confirm('Stop slot ' + slot.slot + ' owned by ' + slot.branch + '? Database data will be preserved.')) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Stopping slot ' + slot.slot + '…');
        const response = await fetch('/api/slots/' + slot.id + '/stop', { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Slot ' + slot.slot + ' stopped. Data was preserved.');
        await load({ clearNotice: false });
      });
    }
    async function stopAll(button) {
      const count = slots.filter((slot) => slot.stopAllowed).length;
      if (!count || !confirm('Stop ' + count + ' safely stoppable slot' + (count === 1 ? '' : 's') + '? Database data will be preserved; blocked slots will be skipped.')) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Stopping ' + count + ' slot' + (count === 1 ? '' : 's') + '…');
        const response = await fetch('/api/slots/stop-all', { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        const message = 'Stopped ' + result.stopped.length + '; skipped ' + result.skipped.length + '; failed ' + result.failed.length + '.';
        updateNotice(notice, message, result.failed.length > 0);
        await load({ clearNotice: false });
      });
    }
    async function releaseClaim(slot, button) {
      const message = 'Release slot ' + slot.slot + ' from ' + slot.branch + '? This only clears the slot selection; worktree and database data stay untouched.';
      if (!confirm(message)) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Releasing slot ' + slot.slot + ' claim…');
        const response = await fetch('/api/slots/' + slot.id + '/release', { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Slot ' + slot.slot + ' claim released. Worktree and database data were preserved.');
        await load({ clearNotice: false });
      });
    }
    async function deleteData(slot, button) {
      const expected = 'DELETE SLOT ' + slot.slot;
      const confirmation = prompt('Permanently delete Postgres and MinIO data for slot ' + slot.slot + ' (' + slot.branch + ')? The worktree and slot claim will remain. Type ' + expected + ' to continue.');
      if (confirmation === null) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Deleting data for slot ' + slot.slot + '…');
        const query = new URLSearchParams({ confirmation });
        const response = await fetch('/api/slots/' + slot.id + '/delete-data?' + query, { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Slot ' + slot.slot + ' data deleted. Worktree and slot claim were preserved.');
        await load({ clearNotice: false });
      });
    }
    async function removeWorktree(slot, button) {
      const expected = 'REMOVE WORKTREE ' + slot.slot;
      const confirmation = prompt('Permanently remove worktree ' + slot.worktree + '? Its slot claim will be removed with it, but branch ' + slot.branch + ' will remain. Type ' + expected + ' to continue.');
      if (confirmation === null) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Removing worktree for slot ' + slot.slot + '…');
        const query = new URLSearchParams({ confirmation });
        const response = await fetch('/api/slots/' + slot.id + '/remove-worktree?' + query, { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Worktree removed. Branch ' + slot.branch + ' was preserved.');
        await load({ clearNotice: false });
      });
    }
    function selectedMode() { return document.querySelector('#mode').value; }
    async function start(slot, slotSelect, button) {
      const targetSlot = Number(slotSelect.value);
      const mode = selectedMode();
      const movement = targetSlot === slot.slot ? '' : ' and move its claim to slot ' + targetSlot;
      if (!confirm('Start ' + slot.branch + movement + ' in ' + mode + ' mode?')) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Starting ' + slot.branch + ' on slot ' + targetSlot + '…');
        const query = new URLSearchParams({ slot: String(targetSlot), mode });
        const response = await fetch('/api/slots/' + slot.id + '/start?' + query, { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Slot ' + targetSlot + ' is ready in ' + mode + ' mode.');
        await load({ clearNotice: false });
      });
    }
    async function restart(slot, button) {
      const mode = selectedMode();
      if (!confirm('Restart slot ' + slot.slot + ' in ' + mode + ' mode? Database data will be preserved.')) return;
      return disableDuring(button, async () => {
        updateNotice(notice, 'Restarting slot ' + slot.slot + '…');
        const query = new URLSearchParams({ mode });
        const response = await fetch('/api/slots/' + slot.id + '/restart?' + query, { method: 'POST', headers: { 'x-dev-slots-token': token } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        updateNotice(notice, 'Slot ' + slot.slot + ' restarted in ' + mode + ' mode.');
        await load({ clearNotice: false });
      });
    }
    async function showLogs(slot) {
      setText(logsDialog.querySelector('strong'), 'Slot ' + slot.slot + ' logs');
      setText(logsDialog.querySelector('pre'), 'Loading…');
      logsDialog.showModal();
      const response = await fetch('/api/slots/' + slot.id + '/logs', { headers: { 'x-dev-slots-token': token } });
      const result = await response.json();
      setText(logsDialog.querySelector('pre'), response.ok ? result.logs : result.error);
    }
    document.querySelector('#refresh').onclick = () => load().catch(showError);
    stopAllButton.onclick = () => stopAll(stopAllButton).catch(showError);
    document.querySelector('#close-logs').onclick = () => logsDialog.close();
    function updateThemeButton() {
      const isLight = document.documentElement.dataset.theme === 'light';
      themeButton.textContent = isLight ? 'Dark mode' : 'Light mode';
    }
    themeButton.onclick = () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem('dev-slots-theme', theme); } catch {}
      updateThemeButton();
    };
    function showError(error) { updateNotice(notice, error.message, true); }
    updateThemeButton();
    load().catch(showError);
  </script>
</body>
</html>`;
}

export function createSlotsHandler(options) {
  return createApiHandler({ ...options, renderPage: page });
}

export function createSlotsServer(options) {
  return http.createServer(createSlotsHandler(options));
}

export async function main(args = process.argv.slice(2)) {
  const repoDir = path.resolve(import.meta.dirname, "..");
  const command = args[0] ?? "serve";
  if (command === "list") {
    process.stdout.write(
      `${JSON.stringify(await discoverSlotsWithRemoval(repoDir), null, 2)}\n`,
    );
    return;
  }
  if (command !== "serve")
    throw new Error(`Unknown dev slots command: ${command}`);
  const portIndex = args.indexOf("--port");
  const port = portIndex === -1 ? 4317 : Number(args[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("--port must be a valid port number.");
  const token = randomBytes(24).toString("base64url");
  const server = createSlotsServer({ repoDir, token });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`Ayunis dev slots: http://127.0.0.1:${port}\n`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  });
}
